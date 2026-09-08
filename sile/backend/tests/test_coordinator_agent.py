import json
import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

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
    AgentSession,
    AgentInteraction,
    SessionType,
    SessionStatus,
    AgentName,
    InteractionStatus,
)
from app.schemas.agents import (
    MultiAgentResponse,
    LearnerContextFrame,
    ContentAdaptationResult,
    AccessibilityAdaptationResult,
)
from app.services.agents.coordinator_agent import CoordinatorAgent


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


@pytest.mark.asyncio
async def test_coordinator_lesson_adaptation_workflow(async_db: AsyncSession):
    """Test full lesson adaptation workflow orchestration."""
    session = async_db

    # 1. User, Profile, Preferences
    user = User(email="coord_student@sile.org", password_hash="pw", role=UserRole.LEARNER)
    session.add(user)
    await session.flush()

    profile = LearnerProfile(
        user_id=user.id,
        full_name="Coord Student",
        grade="Grade 8",
        learning_pace=LearningPace.MODERATE,
        preferred_content_type=PreferredContentType.VISUAL,
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

    topic = Topic(subject_id=subject.id, code="MATH-8-ALG", name="Algebra Basics")
    session.add(topic)
    await session.flush()

    content = LearningContent(
        subject_id=subject.id,
        topic_id=topic.id,
        title="Solving for x in Linear Equations",
        difficulty_level=ContentDifficulty.DEVELOPING,
        content_type=ContentType.EXPLANATION,
        content_body="Isolate x by performing inverse operations.",
    )
    session.add(content)
    await session.commit()

    # 3. Instantiate CoordinatorAgent with MockLLMProvider
    coordinator = CoordinatorAgent(llm_provider=MockLLMProvider())

    # 4. Execute lesson_adaptation
    response = await coordinator.coordinate(
        db=session,
        learner_profile_id=profile.id,
        session_type=SessionType.LESSON_ADAPTATION,
        topic_id=topic.id,
        content_id=content.id,
    )

    # 5. Verify response structure
    assert isinstance(response, MultiAgentResponse)
    assert response.session_id is not None
    assert response.learner_context is not None
    assert response.learner_context.learner_level == "Grade 8"
    assert response.adapted_content is not None
    assert response.accessibility_adaptation is not None
    assert response.assessment is None  # Not requested for lesson_adaptation
    assert len(response.agent_results) == 3

    # Verify execution order: Learner Analysis -> Content Adaptation -> Accessibility
    agent_names = [res.agent_name for res in response.agent_results]
    assert agent_names == [
        AgentName.LEARNER_ANALYSIS,
        AgentName.CONTENT_ADAPTATION,
        AgentName.ACCESSIBILITY,
    ]

    # 6. Verify Database Session & Interactions Persistence
    db_session = (
        await session.execute(
            select(AgentSession)
            .options(selectinload(AgentSession.interactions))
            .where(AgentSession.id == response.session_id)
        )
    ).scalar_one()

    assert db_session.status == SessionStatus.COMPLETED
    assert len(db_session.interactions) == 3
    assert all(i.status == InteractionStatus.COMPLETED for i in db_session.interactions)
    assert all(i.latency_ms >= 0 for i in db_session.interactions)


@pytest.mark.asyncio
async def test_coordinator_formative_assessment_workflow(async_db: AsyncSession):
    """Test formative assessment workflow orchestration including assessment generation."""
    session = async_db

    user = User(email="fa_student@sile.org", password_hash="pw", role=UserRole.LEARNER)
    session.add(user)
    await session.flush()

    profile = LearnerProfile(user_id=user.id, full_name="FA Student", grade="Grade 7")
    session.add(profile)
    await session.flush()

    subject = Subject(code="MATH-7", name="Math 7")
    session.add(subject)
    await session.flush()

    topic = Topic(subject_id=subject.id, code="MATH-7-FRAC", name="Fractions Multiplication")
    session.add(topic)
    await session.flush()

    content = LearningContent(
        subject_id=subject.id,
        topic_id=topic.id,
        title="Multiply Fractions Step-by-Step",
        difficulty_level=ContentDifficulty.DEVELOPING,
        content_type=ContentType.EXPLANATION,
        content_body="Multiply numerators, then denominators.",
    )
    session.add(content)
    await session.commit()

    coordinator = CoordinatorAgent(llm_provider=MockLLMProvider())

    response = await coordinator.coordinate(
        db=session,
        learner_profile_id=profile.id,
        session_type=SessionType.FORMATIVE_ASSESSMENT,
        topic_id=topic.id,
        content_id=content.id,
    )

    assert isinstance(response, MultiAgentResponse)
    assert response.assessment is not None
    assert len(response.assessment) >= 1
    assert len(response.agent_results) == 4

    agent_names = [res.agent_name for res in response.agent_results]
    assert agent_names == [
        AgentName.LEARNER_ANALYSIS,
        AgentName.CONTENT_ADAPTATION,
        AgentName.ASSESSMENT,
        AgentName.ACCESSIBILITY,
    ]


@pytest.mark.asyncio
async def test_coordinator_interactive_tutoring_workflow(async_db: AsyncSession):
    """Test interactive tutoring workflow with user inquiry."""
    session = async_db

    user = User(email="tutor_student@sile.org", password_hash="pw", role=UserRole.LEARNER)
    session.add(user)
    await session.flush()

    profile = LearnerProfile(user_id=user.id, full_name="Tutor Student", grade="Grade 9")
    session.add(profile)
    await session.flush()

    subject = Subject(code="MATH-9", name="Math 9")
    session.add(subject)
    await session.flush()

    topic = Topic(subject_id=subject.id, code="MATH-9-QUAD", name="Quadratic Equations")
    session.add(topic)
    await session.flush()

    content = LearningContent(
        subject_id=subject.id,
        topic_id=topic.id,
        title="Quadratic Formula",
        difficulty_level=ContentDifficulty.ADVANCED,
        content_type=ContentType.EXPLANATION,
        content_body="x = (-b +- sqrt(b^2 - 4ac)) / (2a)",
    )
    session.add(content)
    await session.commit()

    coordinator = CoordinatorAgent(llm_provider=MockLLMProvider())

    response = await coordinator.coordinate(
        db=session,
        learner_profile_id=profile.id,
        session_type=SessionType.INTERACTIVE_TUTORING,
        topic_id=topic.id,
        content_id=content.id,
        user_inquiry="Why is the discriminant under the square root?",
    )

    assert isinstance(response, MultiAgentResponse)
    assert response.learner_context is not None
    assert response.adapted_content is not None
    assert response.accessibility_adaptation is not None
    assert response.assessment is not None

    db_session = (
        await session.execute(
            select(AgentSession).where(AgentSession.id == response.session_id)
        )
    ).scalar_one()
    assert db_session.user_inquiry == "Why is the discriminant under the square root?"
    assert db_session.status == SessionStatus.COMPLETED


@pytest.mark.asyncio
async def test_coordinator_non_existent_profile_raises(async_db: AsyncSession):
    """Test that invalid profile ID fails cleanly and raises EntityNotFoundException."""
    coordinator = CoordinatorAgent(llm_provider=MockLLMProvider())

    with pytest.raises(Exception):
        await coordinator.coordinate(
            db=async_db,
            learner_profile_id=uuid.uuid4(),
            session_type=SessionType.LESSON_ADAPTATION,
        )
