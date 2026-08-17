import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

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
    QuestionDifficulty,
    LearningLevel,
)


@pytest.fixture
async def test_db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.mark.asyncio
async def test_complete_schema_and_relationships(test_db_session: AsyncSession):
    # 1. Create User
    user = User(
        email="learner@sile.org",
        password_hash="$2b$12$securehashedpasswordbytesexample",
        role=UserRole.LEARNER,
        is_active=True,
    )
    test_db_session.add(user)
    await test_db_session.flush()

    assert user.id is not None
    assert user.created_at is not None

    # 2. Create LearnerProfile
    profile = LearnerProfile(
        user_id=user.id,
        full_name="Alex Morgan",
        age=16,
        grade="10th",
        preferred_language="en",
        learning_pace=LearningPace.SLOW,
        preferred_content_type=PreferredContentType.VISUAL,
    )
    test_db_session.add(profile)
    await test_db_session.flush()

    # 3. Create LearningPreference
    learning_pref = LearningPreference(
        learner_profile_id=profile.id,
        visual_explanations=True,
        step_by_step=True,
        simplified_language=True,
        audio_support=True,
        interactive_learning=True,
        short_sessions=True,
    )
    test_db_session.add(learning_pref)

    # 4. Create AccessibilityPreference
    a11y_pref = AccessibilityPreference(
        learner_profile_id=profile.id,
        large_text=True,
        high_contrast=True,
        text_to_speech=True,
        reduced_visual_complexity=True,
        keyboard_navigation=True,
    )
    test_db_session.add(a11y_pref)
    await test_db_session.flush()

    # 5. Create Assessment
    assessment = Assessment(
        title="Baseline Diagnostic Test",
        subject="Foundational Mathematics & Logic",
        description="Assesses numerical reasoning and logic patterns",
        total_questions=2,
    )
    test_db_session.add(assessment)
    await test_db_session.flush()

    # 6. Create AssessmentQuestions
    q1 = AssessmentQuestion(
        assessment_id=assessment.id,
        question_text="What is 15 + 27?",
        options=[
            {"key": "A", "text": "40"},
            {"key": "B", "text": "42"},
            {"key": "C", "text": "45"},
            {"key": "D", "text": "52"},
        ],
        correct_answer="B",
        difficulty=QuestionDifficulty.BEGINNER,
        order_number=1,
    )
    q2 = AssessmentQuestion(
        assessment_id=assessment.id,
        question_text="Which number completes the pattern: 2, 4, 8, 16, __?",
        options=[
            {"key": "A", "text": "24"},
            {"key": "B", "text": "30"},
            {"key": "C", "text": "32"},
            {"key": "D", "text": "64"},
        ],
        correct_answer="C",
        difficulty=QuestionDifficulty.INTERMEDIATE,
        order_number=2,
    )
    test_db_session.add_all([q1, q2])
    await test_db_session.flush()

    # 7. Create AssessmentAttempt
    attempt = AssessmentAttempt(
        learner_profile_id=profile.id,
        assessment_id=assessment.id,
        score=2.0,
        percentage=100.0,
        learning_level=LearningLevel.PROFICIENT,
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
    )
    test_db_session.add(attempt)
    await test_db_session.flush()

    # 8. Create AssessmentAnswers
    ans1 = AssessmentAnswer(
        attempt_id=attempt.id,
        question_id=q1.id,
        selected_answer="B",
        is_correct=True,
    )
    ans2 = AssessmentAnswer(
        attempt_id=attempt.id,
        question_id=q2.id,
        selected_answer="C",
        is_correct=True,
    )
    test_db_session.add_all([ans1, ans2])
    await test_db_session.commit()

    # Query verification with eager relationships
    stmt = (
        select(LearnerProfile)
        .options(
            selectinload(LearnerProfile.user),
            selectinload(LearnerProfile.learning_preference),
            selectinload(LearnerProfile.accessibility_preference),
            selectinload(LearnerProfile.assessment_attempts).selectinload(AssessmentAttempt.answers),
        )
        .where(LearnerProfile.id == profile.id)
    )
    result = await test_db_session.execute(stmt)
    loaded_profile = result.scalar_one()

    assert loaded_profile.full_name == "Alex Morgan"
    assert loaded_profile.learning_pace == LearningPace.SLOW
    assert loaded_profile.user.email == "learner@sile.org"
    assert loaded_profile.learning_preference.visual_explanations is True
    assert loaded_profile.accessibility_preference.high_contrast is True
    assert len(loaded_profile.assessment_attempts) == 1
    assert loaded_profile.assessment_attempts[0].score == 2.0
    assert len(loaded_profile.assessment_attempts[0].answers) == 2
    assert loaded_profile.assessment_attempts[0].answers[0].is_correct is True
