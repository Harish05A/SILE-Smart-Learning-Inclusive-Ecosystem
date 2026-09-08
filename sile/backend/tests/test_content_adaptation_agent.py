import json
import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from app.db.base import Base
from app.core.exceptions import EntityNotFoundException
from app.core.llm import BaseLLMProvider, MockLLMProvider, LLMProviderException
from app.models import (
    User,
    UserRole,
    LearnerProfile,
    LearningPace,
    PreferredContentType,
    LearningPreference,
    AccessibilityPreference,
    Subject,
    Topic,
    LearningContent,
    ContentDifficulty,
    ContentType,
    PracticeAttempt,
)
from app.schemas.agents import ContentAdaptationResult, LearnerContextFrame, WorkedExample
from app.services.agents.analysis_agent import LearnerAnalysisAgent
from app.services.agents.content_adaptation_agent import ContentAdaptationAgent


@pytest.fixture
async def async_db():
    """In-memory SQLite async test database session."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


class RecordingMockProvider(MockLLMProvider):
    """Mock provider that records user prompts for PII and grounding verification."""
    def __init__(self):
        super().__init__()
        self.recorded_prompts = []

    async def generate_structured(self, system_prompt, user_prompt, response_schema, temperature=0.2, **kwargs):
        self.recorded_prompts.append(user_prompt)
        return await super().generate_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_schema=response_schema,
            temperature=temperature,
            **kwargs
        )


class FailingMockProvider(BaseLLMProvider):
    """Mock provider that simulates LLM network or API failure."""
    async def generate_structured(self, system_prompt, user_prompt, response_schema, temperature=0.2, **kwargs):
        raise LLMProviderException("Simulated API failure or timeout")


@pytest.mark.asyncio
async def test_content_adaptation_agent_full_flow(async_db: AsyncSession):
    """Test full adaptation flow with LearnerContextFrame and Phase 2 LearningContent."""
    session = async_db

    # 1. Create Subject, Topic, and Learning Content
    subject = Subject(code="MATH-6", name="Mathematics 6")
    session.add(subject)
    await session.flush()

    topic = Topic(subject_id=subject.id, code="MATH-6-FRAC", name="Adding Fractions")
    session.add(topic)
    await session.flush()

    content = LearningContent(
        subject_id=subject.id,
        topic_id=topic.id,
        title="Adding Fractions with Like Denominators",
        difficulty_level=ContentDifficulty.BEGINNER,
        content_type=ContentType.EXPLANATION,
        content_body="To add fractions with like denominators, add the numerators and keep the denominator the same: a/c + b/c = (a+b)/c.",
        estimated_duration_minutes=5,
    )
    session.add(content)
    await session.commit()

    # 2. Build LearnerContextFrame
    learner_context = LearnerContextFrame(
        learner_level="Grade 6",
        overall_mastery=0.45,
        weak_topics=["Adding Fractions"],
        strong_topics=["Basic Addition"],
        recent_performance_summary="Recent practice score is 45%.",
        learning_preferences={"visual_explanations": True, "step_by_step": True},
        accessibility_preferences={"high_contrast": True},
        recommended_difficulty="developing",
        evidence_based_learning_gaps=["Accuracy on fraction sums is 40% across 5 attempts."],
        prerequisite_blockers=["Understanding Denominators"],
        adaptation_parameters={"pace": "moderate", "short_sessions": False},
    )

    # 3. Instantiate ContentAdaptationAgent with RecordingMockProvider
    mock_provider = RecordingMockProvider()
    agent = ContentAdaptationAgent(llm_provider=mock_provider)

    # 4. Adapt Content
    result = await agent.adapt(
        db=session,
        learner_context=learner_context,
        content_id=content.id,
    )

    # 5. Verify Output Structure & Grounding
    assert isinstance(result, ContentAdaptationResult)
    assert content.title in result.title or "Adding Fractions" in result.title
    assert result.complexity_level is not None
    assert len(result.key_concepts) > 0
    assert len(result.worked_examples) > 0
    assert len(result.scaffolding_steps) > 0

    # 6. Verify Privacy: Prompt contains NO PII
    assert len(mock_provider.recorded_prompts) == 1
    prompt_json = mock_provider.recorded_prompts[0]
    assert "Adding Fractions with Like Denominators" in prompt_json
    assert "secret" not in prompt_json.lower()
    assert "email" not in prompt_json.lower()


@pytest.mark.asyncio
async def test_content_adaptation_deterministic_fallback(async_db: AsyncSession):
    """Test that when the LLM provider fails, a high-quality deterministic fallback is returned."""
    session = async_db

    subject = Subject(code="MATH-7", name="Mathematics 7")
    session.add(subject)
    await session.flush()

    topic = Topic(subject_id=subject.id, code="MATH-7-EQ", name="Linear Equations")
    session.add(topic)
    await session.flush()

    content = LearningContent(
        subject_id=subject.id,
        topic_id=topic.id,
        title="Solving One-Step Equations",
        difficulty_level=ContentDifficulty.DEVELOPING,
        content_type=ContentType.EXPLANATION,
        content_body="Isolate the variable by performing the inverse operation on both sides.",
        estimated_duration_minutes=8,
    )
    session.add(content)
    await session.commit()

    learner_context = LearnerContextFrame(
        learner_level="Grade 7",
        overall_mastery=0.72,
        weak_topics=[],
        strong_topics=["Arithmetic"],
        recent_performance_summary="Good mastery.",
        learning_preferences={"step_by_step": True},
        accessibility_preferences={"reduced_visual_complexity": True},
        recommended_difficulty="proficient",
        prerequisite_blockers=["Basic Operations"],
    )

    failing_provider = FailingMockProvider()
    agent = ContentAdaptationAgent(llm_provider=failing_provider)

    # Adapt with failing LLM
    result = await agent.adapt(db=session, learner_context=learner_context, content_id=content.id)

    # Must return valid ContentAdaptationResult without raising
    assert isinstance(result, ContentAdaptationResult)
    assert "Solving One-Step Equations" in result.title
    assert "Linear Equations" in result.key_concepts
    assert len(result.worked_examples) >= 1
    assert result.complexity_level == "proficient"
    assert "Prerequisite Check" in result.scaffolding_steps[0]
    assert "Step-by-Step Breakdown" in result.adapted_explanation


@pytest.mark.asyncio
async def test_content_adaptation_preserves_custom_llm_response(async_db: AsyncSession):
    """Test that custom/canned LLM response is validated and returned."""
    session = async_db

    subject = Subject(code="MATH-8", name="Mathematics 8")
    session.add(subject)
    await session.flush()

    topic = Topic(subject_id=subject.id, code="MATH-8-EXP", name="Exponents")
    session.add(topic)
    await session.flush()

    content = LearningContent(
        subject_id=subject.id,
        topic_id=topic.id,
        title="Product Rule of Exponents",
        difficulty_level=ContentDifficulty.DEVELOPING,
        content_type=ContentType.EXPLANATION,
        content_body="x^a * x^b = x^(a+b)",
    )
    session.add(content)
    await session.commit()

    mock_provider = MockLLMProvider()
    custom_adaptation = ContentAdaptationResult(
        title="Visual Guide: Product Rule of Exponents",
        adapted_explanation="When multiplying like bases, simply add their powers together.",
        key_concepts=["Like Bases", "Exponent Addition"],
        worked_examples=[
            WorkedExample(
                title="Example: 2^3 * 2^4",
                problem="Simplify 2^3 * 2^4",
                solution_steps=["Base is 2 for both", "Add exponents: 3 + 4 = 7", "Result: 2^7"],
                explanation="Exponents combine additively.",
            )
        ],
        scaffolding_steps=["Identify base", "Add exponents", "Simplify result"],
        complexity_level="developing",
        adaptation_rationale="Tailored for developing learner.",
    )
    mock_provider.set_mock_response("ContentAdaptationResult", custom_adaptation)

    agent = ContentAdaptationAgent(llm_provider=mock_provider)
    learner_context = LearnerContextFrame(
        learner_level="Grade 8",
        overall_mastery=0.60,
        recent_performance_summary="Developing.",
        recommended_difficulty="developing",
    )

    result = await agent.adapt(db=session, learner_context=learner_context, content_id=content.id)

    assert result.title == "Visual Guide: Product Rule of Exponents"
    assert len(result.worked_examples) == 1
    assert result.worked_examples[0].problem == "Simplify 2^3 * 2^4"


@pytest.mark.asyncio
async def test_content_adaptation_missing_content_raises_404(async_db: AsyncSession):
    """Test that specifying non-existent content_id raises EntityNotFoundException."""
    agent = ContentAdaptationAgent(llm_provider=MockLLMProvider())
    learner_context = LearnerContextFrame(
        learner_level="Grade 6",
        overall_mastery=0.50,
        recent_performance_summary="Summary",
        recommended_difficulty="beginner",
    )

    with pytest.raises(EntityNotFoundException):
        await agent.adapt(db=async_db, learner_context=learner_context, content_id=uuid.uuid4())


@pytest.mark.asyncio
async def test_end_to_end_analysis_to_adaptation_pipeline(async_db: AsyncSession):
    """
    Integration Pipeline Test:
    LearnerProfile -> Phase 2 Performance -> LearnerAnalysisAgent -> LearnerContextFrame -> ContentAdaptationAgent -> ContentAdaptationResult
    """
    session = async_db

    # 1. User & Profile
    user = User(email="pipeline_student@sile.org", password_hash="pw", role=UserRole.LEARNER)
    session.add(user)
    await session.flush()

    profile = LearnerProfile(
        user_id=user.id,
        full_name="Pipeline Student",
        grade="Grade 8",
        learning_pace=LearningPace.SLOW,
        preferred_content_type=PreferredContentType.INTERACTIVE,
    )
    session.add(profile)
    await session.flush()

    pref = LearningPreference(learner_profile_id=profile.id, visual_explanations=True, step_by_step=True)
    access = AccessibilityPreference(learner_profile_id=profile.id, high_contrast=True)
    session.add_all([pref, access])
    await session.flush()

    # 2. Curriculum
    subject = Subject(code="MATH-8", name="Math 8")
    session.add(subject)
    await session.flush()

    topic = Topic(subject_id=subject.id, code="MATH-8-GEO", name="Pythagorean Theorem")
    session.add(topic)
    await session.flush()

    content = LearningContent(
        subject_id=subject.id,
        topic_id=topic.id,
        title="Understanding Pythagorean Theorem",
        difficulty_level=ContentDifficulty.DEVELOPING,
        content_type=ContentType.EXPLANATION,
        content_body="In a right triangle, a^2 + b^2 = c^2 where c is the hypotenuse.",
    )
    session.add(content)

    # 3. Practice history (Low mastery)
    for _ in range(3):
        session.add(
            PracticeAttempt(
                learner_profile_id=profile.id,
                topic_id=topic.id,
                score=1.0,
                percentage=33.3,
                difficulty=ContentDifficulty.BEGINNER,
                completed_at=datetime.now(timezone.utc),
            )
        )
    await session.commit()

    # 4. Run LearnerAnalysisAgent
    analysis_agent = LearnerAnalysisAgent(llm_provider=MockLLMProvider())
    learner_context = await analysis_agent.analyze(db=session, learner_profile_id=profile.id, topic_id=topic.id)

    assert isinstance(learner_context, LearnerContextFrame)
    assert learner_context.learner_level == "Grade 8"

    # 5. Run ContentAdaptationAgent using the context frame
    adaptation_agent = ContentAdaptationAgent(llm_provider=MockLLMProvider())
    adaptation_result = await adaptation_agent.adapt(
        db=session,
        learner_context=learner_context,
        content_id=content.id,
    )

    # 6. Verify adapted output
    assert isinstance(adaptation_result, ContentAdaptationResult)
    assert len(adaptation_result.key_concepts) > 0
    assert len(adaptation_result.worked_examples) > 0
    assert len(adaptation_result.scaffolding_steps) > 0
