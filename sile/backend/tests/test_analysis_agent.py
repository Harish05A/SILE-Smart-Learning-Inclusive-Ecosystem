import json
import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from app.db.base import Base
from app.core.llm import MockLLMProvider, BaseLLMProvider, LLMProviderException, LLMValidationException
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
    TopicPerformance,
)
from app.schemas.agents import LearnerContextFrame
from app.services.agents.analysis_agent import LearnerAnalysisAgent


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
    """Mock provider that records user prompts for PII and safety verification."""
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
    """Mock provider that simulates upstream API failure."""
    async def generate_structured(self, system_prompt, user_prompt, response_schema, temperature=0.2, **kwargs):
        raise LLMProviderException("Simulated API failure or timeout")


@pytest.mark.asyncio
async def test_learner_analysis_agent_full_flow(async_db: AsyncSession):
    """
    Test complete analysis flow with MockLLMProvider:
    Loads profile, preferences, topics, practice attempts, and verifies non-PII prompt and LearnerContextFrame.
    """
    session = async_db

    # 1. Create User, Profile, and Preferences
    user = User(
        email="student.secret@sile.org",
        password_hash="secret_hash",
        role=UserRole.LEARNER,
    )
    session.add(user)
    await session.flush()

    profile = LearnerProfile(
        user_id=user.id,
        full_name="Alice Wonder",
        grade="Grade 7",
        learning_pace=LearningPace.MODERATE,
        preferred_content_type=PreferredContentType.VISUAL,
    )
    session.add(profile)
    await session.flush()

    pref = LearningPreference(
        learner_profile_id=profile.id,
        visual_explanations=True,
        step_by_step=True,
        short_sessions=True,
    )
    access = AccessibilityPreference(
        learner_profile_id=profile.id,
        high_contrast=True,
        large_text=False,
    )
    session.add_all([pref, access])
    await session.flush()

    # 2. Create Curriculum (Prerequisite Topic -> Target Topic)
    subject = Subject(code="MATH-7", name="Mathematics 7")
    session.add(subject)
    await session.flush()

    topic_prereq = Topic(
        subject_id=subject.id,
        code="MATH-7-ARITH",
        name="Basic Arithmetic",
        order_number=1,
    )
    session.add(topic_prereq)
    await session.flush()

    topic_target = Topic(
        subject_id=subject.id,
        prerequisite_topic_id=topic_prereq.id,
        code="MATH-7-FRAC",
        name="Fractions",
        order_number=2,
    )
    session.add(topic_target)
    await session.flush()

    # 3. Add Practice Attempts (Prereq is low accuracy 20%, Target is low 40%)
    now = datetime.now(timezone.utc)
    for _ in range(4):
        att_prereq = PracticeAttempt(
            learner_profile_id=profile.id,
            topic_id=topic_prereq.id,
            score=1.0,
            percentage=20.0,
            difficulty=ContentDifficulty.BEGINNER,
            completed_at=now,
        )
        session.add(att_prereq)

    for _ in range(4):
        att_target = PracticeAttempt(
            learner_profile_id=profile.id,
            topic_id=topic_target.id,
            score=2.0,
            percentage=40.0,
            difficulty=ContentDifficulty.BEGINNER,
            completed_at=now,
        )
        session.add(att_target)

    await session.commit()

    # 4. Instantiate LearnerAnalysisAgent with RecordingMockProvider
    mock_provider = RecordingMockProvider()
    agent = LearnerAnalysisAgent(llm_provider=mock_provider)

    # 5. Run analysis targeting Fractions topic
    frame = await agent.analyze(db=session, learner_profile_id=profile.id, topic_id=topic_target.id)

    # 6. Verify LearnerContextFrame output
    assert isinstance(frame, LearnerContextFrame)
    assert 0.0 <= frame.overall_mastery <= 1.0
    assert frame.learning_preferences["visual_explanations"] is True
    assert frame.learning_preferences["short_sessions"] is True
    assert frame.accessibility_preferences["high_contrast"] is True
    assert "Basic Arithmetic" in frame.prerequisite_blockers
    assert len(frame.evidence_based_learning_gaps) > 0

    # 7. Verify Privacy: NO PII was sent to LLM
    assert len(mock_provider.recorded_prompts) == 1
    prompt_str = mock_provider.recorded_prompts[0]
    assert "student.secret@sile.org" not in prompt_str
    assert "Alice Wonder" not in prompt_str
    assert "secret_hash" not in prompt_str

    # 8. Verify Safety: No medical or deficit terms in the output frame
    serialized_frame = json.dumps(frame.model_dump()).lower()
    for forbidden in ["disorder", "deficit", "adhd", "disabled", "dyslexia", "syndrome"]:
        assert forbidden not in serialized_frame


@pytest.mark.asyncio
async def test_learner_analysis_agent_general_topic_omitted(async_db: AsyncSession):
    """Test analysis when topic_id is omitted (general learner evaluation)."""
    session = async_db

    user = User(email="gen@sile.org", password_hash="pw", role=UserRole.LEARNER)
    session.add(user)
    await session.flush()

    profile = LearnerProfile(user_id=user.id, full_name="General Student", grade="Grade 6")
    session.add(profile)
    await session.flush()

    agent = LearnerAnalysisAgent(llm_provider=MockLLMProvider())
    frame = await agent.analyze(db=session, learner_profile_id=profile.id, topic_id=None)

    assert isinstance(frame, LearnerContextFrame)
    assert frame.learner_level == "Grade 6"
    assert frame.overall_mastery >= 0.0


@pytest.mark.asyncio
async def test_learner_analysis_agent_fallback_on_llm_failure(async_db: AsyncSession):
    """Test that agent gracefully falls back to deterministic frame when LLM provider fails."""
    session = async_db

    user = User(email="fail_test@sile.org", password_hash="pw", role=UserRole.LEARNER)
    session.add(user)
    await session.flush()

    profile = LearnerProfile(
        user_id=user.id,
        full_name="Fallback Learner",
        grade="Grade 9",
        learning_pace=LearningPace.FAST,
    )
    session.add(profile)
    await session.flush()

    failing_provider = FailingMockProvider()
    agent = LearnerAnalysisAgent(llm_provider=failing_provider)

    # Should not raise exception; should return deterministic fallback
    frame = await agent.analyze(db=session, learner_profile_id=profile.id)

    assert isinstance(frame, LearnerContextFrame)
    assert frame.learner_level == "Grade 9"
    assert frame.adaptation_parameters["pace"] == "fast"
    assert frame.overall_mastery >= 0.0


@pytest.mark.asyncio
async def test_learner_analysis_agent_preserves_performance_analyzer_mastery(async_db: AsyncSession):
    """
    Test that the agent strictly preserves the mathematical mastery score
    computed by PerformanceAnalyzer even if LLM returns a different value.
    """
    session = async_db

    user = User(email="mastery_test@sile.org", password_hash="pw", role=UserRole.LEARNER)
    session.add(user)
    await session.flush()

    profile = LearnerProfile(user_id=user.id, full_name="Mastery Learner", grade="Grade 10")
    session.add(profile)
    await session.flush()

    # Pre-set LLM mock to return a synthetic frame with mastery=0.99
    mock_provider = MockLLMProvider()
    preset = LearnerContextFrame(
        learner_level="Grade 10",
        overall_mastery=0.99,  # Intentionally divergent from actual database mastery
        recent_performance_summary="Fake summary",
        recommended_difficulty="advanced",
    )
    mock_provider.set_mock_response("LearnerContextFrame", preset)

    agent = LearnerAnalysisAgent(llm_provider=mock_provider)
    frame = await agent.analyze(db=session, learner_profile_id=profile.id)

    # Real baseline mastery for 0 attempts is 0.50 (from PerformanceAnalyzer)
    # The agent must overwrite the LLM's 0.99 with the authoritative 0.50
    assert frame.overall_mastery == 0.50


@pytest.mark.asyncio
async def test_learner_analysis_agent_missing_profile_raises_404(async_db: AsyncSession):
    """Test that querying a non-existent learner_profile_id raises EntityNotFoundException."""
    agent = LearnerAnalysisAgent(llm_provider=MockLLMProvider())
    non_existent_id = uuid.uuid4()

    with pytest.raises(Exception) as exc_info:
        await agent.analyze(db=async_db, learner_profile_id=non_existent_id)
    assert "not found" in str(exc_info.value).lower()
