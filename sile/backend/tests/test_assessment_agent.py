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
    PracticeQuestion,
    PracticeAttempt,
)
from app.schemas.agents import (
    AssessmentAgentOutput,
    AssessmentQuestionResult,
    ContentAdaptationResult,
    LearnerContextFrame,
)
from app.services.agents.analysis_agent import LearnerAnalysisAgent
from app.services.agents.content_adaptation_agent import ContentAdaptationAgent
from app.services.agents.assessment_agent import AssessmentAgent


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
async def test_assessment_agent_generation_with_curriculum_grounding(async_db: AsyncSession):
    """Test AssessmentAgent generates grounded formative questions from curriculum and context."""
    session = async_db

    # 1. Create Curriculum
    subject = Subject(code="MATH-6", name="Mathematics 6")
    session.add(subject)
    await session.flush()

    topic = Topic(subject_id=subject.id, code="MATH-6-DEC", name="Decimals Multiplication")
    session.add(topic)
    await session.flush()

    content = LearningContent(
        subject_id=subject.id,
        topic_id=topic.id,
        title="Multiplying Decimals by Decimals",
        difficulty_level=ContentDifficulty.DEVELOPING,
        content_type=ContentType.EXPLANATION,
        content_body="Count the total decimal places in both factors. Multiply like whole numbers, then place the decimal point.",
        estimated_duration_minutes=6,
    )
    session.add(content)
    await session.commit()

    # 2. Build LearnerContextFrame
    learner_context = LearnerContextFrame(
        learner_level="Grade 6",
        overall_mastery=0.48,
        weak_topics=["Decimals Multiplication"],
        strong_topics=["Whole Number Multiplication"],
        recent_performance_summary="Recent decimal multiplication score is 45%.",
        recommended_difficulty="developing",
        evidence_based_learning_gaps=["Misplacing decimal point in products."],
        prerequisite_blockers=["Place Value"],
    )

    # 3. Instantiate AssessmentAgent with RecordingMockProvider
    mock_provider = RecordingMockProvider()
    agent = AssessmentAgent(llm_provider=mock_provider)

    # 4. Generate assessment questions
    questions = await agent.generate_assessment(
        db=session,
        learner_context=learner_context,
        content_id=content.id,
    )

    # 5. Verify Output
    assert isinstance(questions, list)
    assert len(questions) >= 1
    for q in questions:
        assert isinstance(q, AssessmentQuestionResult)
        assert q.question is not None
        assert len(q.options) >= 2
        assert q.correct_answer in q.options or len(q.correct_answer) > 0
        assert q.explanation is not None

    # 6. Verify Privacy: Prompt contains NO PII
    assert len(mock_provider.recorded_prompts) == 1
    prompt_str = mock_provider.recorded_prompts[0]
    assert "Decimals Multiplication" in prompt_str
    assert "secret" not in prompt_str.lower()
    assert "email" not in prompt_str.lower()


@pytest.mark.asyncio
async def test_assessment_agent_deterministic_fallback(async_db: AsyncSession):
    """Test that AssessmentAgent returns high-quality deterministic fallback when LLM fails."""
    session = async_db

    subject = Subject(code="MATH-7", name="Mathematics 7")
    session.add(subject)
    await session.flush()

    topic = Topic(subject_id=subject.id, code="MATH-7-RAT", name="Ratios and Proportions")
    session.add(topic)
    await session.flush()

    # Add Phase 2 PracticeQuestion to DB
    practice_q = PracticeQuestion(
        subject_id=subject.id,
        topic_id=topic.id,
        question_text="If 2 apples cost $1.50, what is the cost of 6 apples?",
        options=["A: $3.00", "B: $4.50", "C: $6.00", "D: $1.50"],
        correct_answer="B: $4.50",
        difficulty=ContentDifficulty.DEVELOPING,
        explanation="Scale factor is 3: $1.50 * 3 = $4.50.",
    )
    session.add(practice_q)
    await session.commit()

    learner_context = LearnerContextFrame(
        learner_level="Grade 7",
        overall_mastery=0.55,
        recent_performance_summary="Developing in ratios.",
        recommended_difficulty="developing",
    )

    failing_provider = FailingMockProvider()
    agent = AssessmentAgent(llm_provider=failing_provider)

    questions = await agent.generate_assessment(
        db=session,
        learner_context=learner_context,
        topic_id=topic.id,
    )

    assert isinstance(questions, list)
    assert len(questions) >= 1
    assert questions[0].question == "If 2 apples cost $1.50, what is the cost of 6 apples?"
    assert questions[0].correct_answer == "B: $4.50"
    assert "4.50" in questions[0].explanation


@pytest.mark.asyncio
async def test_assessment_agent_custom_mock_response(async_db: AsyncSession):
    """Test that custom/canned structured LLM assessment response is accepted."""
    session = async_db

    subject = Subject(code="MATH-8", name="Math 8")
    session.add(subject)
    await session.flush()

    topic = Topic(subject_id=subject.id, code="MATH-8-SLOPE", name="Slope-Intercept Form")
    session.add(topic)
    await session.commit()

    custom_output = AssessmentAgentOutput(
        questions=[
            AssessmentQuestionResult(
                question="In the equation y = 3x - 5, what represents the slope?",
                question_type="multiple_choice",
                options=["A) 3", "B) -5", "C) x", "D) y"],
                correct_answer="A) 3",
                explanation="In y = mx + b, m is the coefficient of x representing slope.",
                difficulty="developing",
                targeted_learning_gap="Distinguishing slope (m) from y-intercept (b)",
                distractor_rationales={
                    "B) -5": "Confused y-intercept with slope."
                },
            )
        ]
    )

    mock_provider = MockLLMProvider()
    mock_provider.set_mock_response("AssessmentAgentOutput", custom_output)

    agent = AssessmentAgent(llm_provider=mock_provider)
    learner_context = LearnerContextFrame(
        learner_level="Grade 8",
        overall_mastery=0.60,
        recent_performance_summary="Summary",
        recommended_difficulty="developing",
    )

    questions = await agent.generate_assessment(
        db=session,
        learner_context=learner_context,
        topic_id=topic.id,
    )

    assert len(questions) == 1
    assert questions[0].question == "In the equation y = 3x - 5, what represents the slope?"
    assert questions[0].correct_answer == "A) 3"
    assert "B) -5" in questions[0].distractor_rationales


@pytest.mark.asyncio
async def test_end_to_end_full_phase3_pipeline(async_db: AsyncSession):
    """
    End-to-End Multi-Agent Step 1-5 Integration Pipeline:
    LearnerProfile -> PerformanceAnalyzer -> LearnerAnalysisAgent -> ContentAdaptationAgent -> AssessmentAgent
    """
    session = async_db

    # 1. Base User & Profile
    user = User(email="e2e_student@sile.org", password_hash="pw", role=UserRole.LEARNER)
    session.add(user)
    await session.flush()

    profile = LearnerProfile(
        user_id=user.id,
        full_name="E2E Student",
        grade="Grade 7",
        learning_pace=LearningPace.MODERATE,
        preferred_content_type=PreferredContentType.INTERACTIVE,
    )
    session.add(profile)
    await session.flush()

    pref = LearningPreference(learner_profile_id=profile.id, visual_explanations=True, step_by_step=True)
    access = AccessibilityPreference(learner_profile_id=profile.id, high_contrast=True)
    session.add_all([pref, access])
    await session.flush()

    # 2. Curriculum
    subject = Subject(code="MATH-7", name="Math 7")
    session.add(subject)
    await session.flush()

    topic = Topic(subject_id=subject.id, code="MATH-7-PERC", name="Percentages")
    session.add(topic)
    await session.flush()

    content = LearningContent(
        subject_id=subject.id,
        topic_id=topic.id,
        title="Calculating Percent of a Number",
        difficulty_level=ContentDifficulty.DEVELOPING,
        content_type=ContentType.EXPLANATION,
        content_body="Convert percent to a decimal and multiply by the total amount.",
    )
    session.add(content)

    # 3. Practice History
    for _ in range(3):
        session.add(
            PracticeAttempt(
                learner_profile_id=profile.id,
                topic_id=topic.id,
                score=1.0,
                percentage=40.0,
                difficulty=ContentDifficulty.BEGINNER,
                completed_at=datetime.now(timezone.utc),
            )
        )
    await session.commit()

    # 4. Step 3: Run LearnerAnalysisAgent
    analysis_agent = LearnerAnalysisAgent(llm_provider=MockLLMProvider())
    learner_context = await analysis_agent.analyze(
        db=session, learner_profile_id=profile.id, topic_id=topic.id
    )
    assert isinstance(learner_context, LearnerContextFrame)
    assert learner_context.learner_level == "Grade 7"

    # 5. Step 4: Run ContentAdaptationAgent
    adaptation_agent = ContentAdaptationAgent(llm_provider=MockLLMProvider())
    adapted_content = await adaptation_agent.adapt(
        db=session, learner_context=learner_context, content_id=content.id
    )
    assert isinstance(adapted_content, ContentAdaptationResult)

    # 6. Step 5: Run AssessmentAgent
    assessment_agent = AssessmentAgent(llm_provider=MockLLMProvider())
    formative_questions = await assessment_agent.generate_assessment(
        db=session,
        learner_context=learner_context,
        content_id=content.id,
        adapted_content=adapted_content,
    )

    assert isinstance(formative_questions, list)
    assert len(formative_questions) >= 1
    assert all(isinstance(q, AssessmentQuestionResult) for q in formative_questions)
