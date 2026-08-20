import pytest
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.base import Base
from app.models import (
    User,
    UserRole,
    LearnerProfile,
    LearningPace,
    PreferredContentType,
    LearningPreference,
    AccessibilityPreference,
    Assessment,
    AssessmentQuestion,
    AssessmentAttempt,
    AssessmentAnswer,
    Subject,
    Topic,
    Skill,
    LearningContent,
    ContentDifficulty,
    ContentType,
    TopicPerformance,
    LearningRecommendation,
    LearningPath,
    LearningPathItem,
    PracticeAttempt,
    RecommendationPriority,
    RecommendationStatus,
    LearningPathStatus,
    PathItemStatus,
)


@pytest.fixture
async def async_db_session():
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
async def test_phase2_database_schema_and_relationships(async_db_session: AsyncSession):
    session = async_db_session

    # 1. Create Phase 1 User and Profile
    user = User(
        email="adaptive_learner@sile.org",
        password_hash="fakehash123",
        role=UserRole.LEARNER,
    )
    session.add(user)
    await session.flush()

    profile = LearnerProfile(
        user_id=user.id,
        full_name="Jordan Lee",
        age=15,
        grade="9th Grade",
        learning_pace=LearningPace.MODERATE,
        preferred_content_type=PreferredContentType.VISUAL,
    )
    session.add(profile)
    await session.flush()

    # 2. Create Phase 2 Subject, Topic, Skill, and LearningContent
    subject = Subject(
        code="MATH",
        name="Mathematics",
        description="Foundational & Secondary Mathematics",
        order_number=1,
    )
    session.add(subject)
    await session.flush()

    topic1 = Topic(
        subject_id=subject.id,
        code="MATH_ARITHMETIC",
        name="Basic Arithmetic",
        description="Addition, subtraction, multiplication, and division",
        order_number=1,
    )
    session.add(topic1)
    await session.flush()

    topic2 = Topic(
        subject_id=subject.id,
        prerequisite_topic_id=topic1.id,
        code="MATH_FRACTIONS",
        name="Fractions & Decimals",
        description="Operations with fractions and decimals",
        order_number=2,
    )
    session.add(topic2)
    await session.flush()

    skill = Skill(
        topic_id=topic2.id,
        name="Adding Unlike Fractions",
        description="Finding least common denominators and adding fractions",
        difficulty_level=ContentDifficulty.DEVELOPING,
        order_number=1,
    )
    session.add(skill)
    await session.flush()

    content = LearningContent(
        subject_id=subject.id,
        topic_id=topic2.id,
        skill_id=skill.id,
        title="Visual Guide to Adding Unlike Fractions",
        description="Step-by-step visual fraction bar explanation",
        content_type=ContentType.EXPLANATION,
        content_body="# Adding Unlike Fractions\nUse visual fraction bars to find common denominators.",
        difficulty_level=ContentDifficulty.DEVELOPING,
        estimated_duration_minutes=6,
        media_payload={"visual_type": "fraction_bars", "interactive": True},
        prerequisites=["MATH_ARITHMETIC"],
    )
    session.add(content)
    await session.flush()

    # 3. Create Phase 2 TopicPerformance
    performance = TopicPerformance(
        learner_profile_id=profile.id,
        topic_id=topic2.id,
        attempts=5,
        correct_answers=3,
        accuracy=60.0,
        current_difficulty=ContentDifficulty.DEVELOPING,
        mastery_score=0.58,
    )
    session.add(performance)
    await session.flush()

    # 4. Create Phase 2 LearningRecommendation
    recommendation = LearningRecommendation(
        learner_profile_id=profile.id,
        topic_id=topic2.id,
        content_id=content.id,
        reason="Accuracy in Fractions is below 70%. Reinforcement recommended.",
        priority=RecommendationPriority.HIGH,
        status=RecommendationStatus.PENDING,
    )
    session.add(recommendation)
    await session.flush()

    # 5. Create Phase 2 LearningPath & LearningPathItem
    path = LearningPath(
        learner_profile_id=profile.id,
        subject_id=subject.id,
        title="Personalized Mathematics Mastery Path",
        description="Adaptive pathway targeted at fraction reinforcement",
        status=LearningPathStatus.IN_PROGRESS,
    )
    session.add(path)
    await session.flush()

    path_item = LearningPathItem(
        learning_path_id=path.id,
        content_id=content.id,
        sequence_number=1,
        status=PathItemStatus.IN_PROGRESS,
    )
    session.add(path_item)
    await session.flush()

    # 6. Create Phase 2 PracticeAttempt
    practice = PracticeAttempt(
        learner_profile_id=profile.id,
        topic_id=topic2.id,
        content_id=content.id,
        score=4.0,
        percentage=80.0,
        difficulty=ContentDifficulty.DEVELOPING,
        answers_payload=[{"q": 1, "correct": True}, {"q": 2, "correct": False}],
    )
    session.add(practice)
    await session.commit()

    # 7. Query and verify all relationships load eagerly & correctly
    stmt = (
        select(LearnerProfile)
        .options(
            selectinload(LearnerProfile.topic_performances),
            selectinload(LearnerProfile.recommendations),
            selectinload(LearnerProfile.learning_paths).selectinload(LearningPath.items),
            selectinload(LearnerProfile.practice_attempts),
        )
        .where(LearnerProfile.id == profile.id)
    )
    res = await session.execute(stmt)
    loaded_profile = res.scalar_one()

    assert len(loaded_profile.topic_performances) == 1
    assert loaded_profile.topic_performances[0].accuracy == 60.0

    assert len(loaded_profile.recommendations) == 1
    assert loaded_profile.recommendations[0].priority == RecommendationPriority.HIGH

    assert len(loaded_profile.learning_paths) == 1
    assert len(loaded_profile.learning_paths[0].items) == 1
    assert loaded_profile.learning_paths[0].items[0].sequence_number == 1

    assert len(loaded_profile.practice_attempts) == 1
    assert loaded_profile.practice_attempts[0].percentage == 80.0

    # 8. Query Topic and verify prerequisite navigation
    topic_stmt = (
        select(Topic)
        .options(
            selectinload(Topic.prerequisite_topic),
            selectinload(Topic.skills),
            selectinload(Topic.learning_contents),
        )
        .where(Topic.id == topic2.id)
    )
    topic_res = await session.execute(topic_stmt)
    loaded_topic2 = topic_res.scalar_one()

    assert loaded_topic2.prerequisite_topic is not None
    assert loaded_topic2.prerequisite_topic.code == "MATH_ARITHMETIC"
    assert len(loaded_topic2.skills) == 1
    assert len(loaded_topic2.learning_contents) == 1
