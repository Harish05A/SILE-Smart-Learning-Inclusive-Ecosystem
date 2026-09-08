import pytest
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, exc
from sqlalchemy.orm import selectinload

from app.db.base import Base
from app.models import (
    User,
    UserRole,
    LearnerProfile,
    LearningPace,
    PreferredContentType,
    Subject,
    Topic,
    LearningContent,
    ContentDifficulty,
    ContentType,
    AgentSession,
    AgentInteraction,
    AgentComparisonEvaluation,
    SessionType,
    SessionStatus,
    AgentName,
    InteractionStatus,
)


@pytest.fixture
async def async_db_session():
    """Isolated in-memory SQLite async test database session."""
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
async def test_agent_models_full_lifecycle(async_db_session: AsyncSession):
    session = async_db_session

    # 1. Create Base User & Profile
    user = User(
        email="agent_test@sile.org",
        password_hash="hashed_secure_password",
        role=UserRole.LEARNER,
        is_active=True,
    )
    session.add(user)
    await session.flush()

    profile = LearnerProfile(
        user_id=user.id,
        full_name="Agent Tester",
        grade="Grade 8",
        learning_pace=LearningPace.MODERATE,
        preferred_content_type=PreferredContentType.INTERACTIVE,
    )
    session.add(profile)
    await session.flush()

    # 2. Create Subject & Topic & Content
    subject = Subject(code="MATH-8", name="Mathematics Grade 8")
    session.add(subject)
    await session.flush()

    topic = Topic(subject_id=subject.id, code="MATH-8-FRAC", name="Fractions Operations")
    session.add(topic)
    await session.flush()

    content = LearningContent(
        subject_id=subject.id,
        topic_id=topic.id,
        title="Dividing Fractions with Visuals",
        difficulty_level=ContentDifficulty.DEVELOPING,
        content_type=ContentType.EXPLANATION,
        content_body="Step-by-step reciprocal multiplication.",
    )
    session.add(content)
    await session.flush()

    # 3. Create AgentSession
    agent_session = AgentSession(
        learner_profile_id=profile.id,
        session_type=SessionType.LESSON_ADAPTATION,
        status=SessionStatus.ACTIVE,
        user_inquiry="How do I divide fractions easily?",
        topic_id=topic.id,
        content_id=content.id,
    )
    session.add(agent_session)
    await session.flush()

    assert agent_session.id is not None
    assert agent_session.session_type == SessionType.LESSON_ADAPTATION
    assert agent_session.status == SessionStatus.ACTIVE
    assert agent_session.created_at is not None

    # 4. Create AgentInteractions
    interaction1 = AgentInteraction(
        session_id=agent_session.id,
        agent_name=AgentName.LEARNER_ANALYSIS,
        input_payload={"topic_mastery": 0.45, "learning_gaps": ["reciprocal understanding"]},
        output_payload={"recommended_scaffolding": "visual models", "step_size": "small"},
        status=InteractionStatus.COMPLETED,
        latency_ms=120,
    )
    interaction2 = AgentInteraction(
        session_id=agent_session.id,
        agent_name=AgentName.CONTENT_ADAPTATION,
        input_payload={"concept": "division by fractions"},
        output_payload={"adapted_explanation": "Keep, Change, Flip with pie visual representation"},
        status=InteractionStatus.COMPLETED,
        latency_ms=350,
    )
    session.add_all([interaction1, interaction2])
    await session.flush()

    # 5. Create AgentComparisonEvaluation
    comparison = AgentComparisonEvaluation(
        session_id=agent_session.id,
        rule_based_output={"recommendation_type": "practice", "difficulty": "developing"},
        multi_agent_output={"adapted_explanation": "Visual pie slices", "scaffolding_steps": 3},
        learner_rating=5,
        notes="The visual explanation was much easier to understand than default text.",
    )
    session.add(comparison)
    await session.commit()

    # 6. Verify Relationships & Queries with Eager Loading
    stmt = (
        select(AgentSession)
        .where(AgentSession.id == agent_session.id)
        .options(
            selectinload(AgentSession.learner_profile),
            selectinload(AgentSession.topic),
            selectinload(AgentSession.content),
            selectinload(AgentSession.interactions),
            selectinload(AgentSession.comparison_evaluation),
        )
    )
    result = await session.execute(stmt)
    loaded_session = result.scalar_one()

    assert loaded_session.learner_profile.id == profile.id
    assert loaded_session.topic.id == topic.id
    assert loaded_session.content.id == content.id
    assert len(loaded_session.interactions) == 2
    assert loaded_session.interactions[0].agent_name == AgentName.LEARNER_ANALYSIS
    assert loaded_session.interactions[0].input_payload["topic_mastery"] == 0.45
    assert loaded_session.interactions[1].agent_name == AgentName.CONTENT_ADAPTATION
    assert loaded_session.comparison_evaluation is not None
    assert loaded_session.comparison_evaluation.learner_rating == 5
    assert loaded_session.comparison_evaluation.rule_based_output["recommendation_type"] == "practice"

    # 7. Verify back-population on LearnerProfile
    prof_stmt = (
        select(LearnerProfile)
        .where(LearnerProfile.id == profile.id)
        .options(selectinload(LearnerProfile.agent_sessions))
    )
    prof_res = await session.execute(prof_stmt)
    loaded_prof = prof_res.scalar_one()
    assert len(loaded_prof.agent_sessions) == 1
    assert loaded_prof.agent_sessions[0].id == agent_session.id


@pytest.mark.asyncio
async def test_agent_comparison_rating_valid_values(async_db_session: AsyncSession):
    """Test valid ratings: 1, 3, 5."""
    session = async_db_session

    user = User(email="rate_test@sile.org", password_hash="pw", role=UserRole.LEARNER)
    session.add(user)
    await session.flush()
    profile = LearnerProfile(user_id=user.id, full_name="Rater")
    session.add(profile)
    await session.flush()

    for rating in [1, 3, 5]:
        agent_session = AgentSession(
            learner_profile_id=profile.id,
            session_type=SessionType.INTERACTIVE_TUTORING,
            user_inquiry="Help with fraction word problems",
        )
        session.add(agent_session)
        await session.flush()

        comp = AgentComparisonEvaluation(
            session_id=agent_session.id,
            rule_based_output={"mode": "standard"},
            multi_agent_output={"mode": "dialogue"},
            learner_rating=rating,
        )
        session.add(comp)
        await session.flush()
        assert comp.learner_rating == rating


@pytest.mark.asyncio
async def test_agent_cascade_deletion(async_db_session: AsyncSession):
    """Test that deleting a profile cascades to agent sessions and interactions."""
    session = async_db_session

    user = User(email="cascade_test@sile.org", password_hash="pw", role=UserRole.LEARNER)
    session.add(user)
    await session.flush()
    profile = LearnerProfile(user_id=user.id, full_name="Cascade Tester")
    session.add(profile)
    await session.flush()

    agent_session = AgentSession(
        learner_profile_id=profile.id,
        session_type=SessionType.FORMATIVE_ASSESSMENT,
        user_inquiry="Test inquiry",
    )
    session.add(agent_session)
    await session.flush()

    interaction = AgentInteraction(
        session_id=agent_session.id,
        agent_name=AgentName.ASSESSMENT,
        input_payload={"level": "developing"},
        output_payload={"question": "What is 1/2 + 1/4?"},
        status=InteractionStatus.COMPLETED,
    )
    session.add(interaction)

    comp = AgentComparisonEvaluation(
        session_id=agent_session.id,
        rule_based_output={},
        multi_agent_output={},
    )
    session.add(comp)
    await session.commit()

    # Delete the profile
    await session.delete(profile)
    await session.commit()

    # Verify session and interaction are removed
    sess_stmt = select(AgentSession).where(AgentSession.id == agent_session.id)
    assert (await session.execute(sess_stmt)).scalar_one_or_none() is None

    inter_stmt = select(AgentInteraction).where(AgentInteraction.id == interaction.id)
    assert (await session.execute(inter_stmt)).scalar_one_or_none() is None

    comp_stmt = select(AgentComparisonEvaluation).where(AgentComparisonEvaluation.id == comp.id)
    assert (await session.execute(comp_stmt)).scalar_one_or_none() is None
