import asyncio
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_password_hash
from app.db.session import async_session_factory
from app.models.user import User, UserRole
from app.models.profile import LearnerProfile, LearningPace, PreferredContentType
from app.models.preference import LearningPreference
from app.models.accessibility import AccessibilityPreference
from app.models.assessment import Assessment, AssessmentQuestion, QuestionDifficulty

# ==============================================================================
# DEMO SEED CONFIGURATION (DEVELOPMENT ONLY)
# ==============================================================================

DEMO_USER_EMAIL = "demo.learner@sile.org"
DEMO_USER_PASSWORD_RAW = "DemoPassword123"  # Documented for development demonstration only
DEMO_USER_FULL_NAME = "Alex Morgan [DEMO]"

DEMO_ASSESSMENT_TITLE = "Foundational Mathematics Baseline Diagnostic [DEMO]"
DEMO_ASSESSMENT_SUBJECT = "Mathematics"
DEMO_ASSESSMENT_DESCRIPTION = (
    "A 10-question foundational diagnostic assessing arithmetic, fractions, percentages, "
    "elementary algebra, geometry, and pattern recognition to establish baseline learning difficulty."
)

DEMO_QUESTIONS = [
    {
        "order_number": 1,
        "question_text": "What is 348 + 275?",
        "options": [
            {"key": "A", "text": "613"},
            {"key": "B", "text": "623"},
            {"key": "C", "text": "633"},
            {"key": "D", "text": "615"},
        ],
        "correct_answer": "B",
        "difficulty": QuestionDifficulty.BEGINNER,
    },
    {
        "order_number": 2,
        "question_text": "Calculate: (180 ÷ 15) × 4",
        "options": [
            {"key": "A", "text": "48"},
            {"key": "B", "text": "36"},
            {"key": "C", "text": "52"},
            {"key": "D", "text": "44"},
        ],
        "correct_answer": "A",
        "difficulty": QuestionDifficulty.BEGINNER,
    },
    {
        "order_number": 3,
        "question_text": "What is 3/5 + 1/10 expressed in simplest fractional form?",
        "options": [
            {"key": "A", "text": "4/15"},
            {"key": "B", "text": "7/10"},
            {"key": "C", "text": "2/5"},
            {"key": "D", "text": "1/2"},
        ],
        "correct_answer": "B",
        "difficulty": QuestionDifficulty.BEGINNER,
    },
    {
        "order_number": 4,
        "question_text": "What is 4/7 × 14/8 in simplest form?",
        "options": [
            {"key": "A", "text": "1/2"},
            {"key": "B", "text": "1"},
            {"key": "C", "text": "2"},
            {"key": "D", "text": "7/8"},
        ],
        "correct_answer": "B",
        "difficulty": QuestionDifficulty.INTERMEDIATE,
    },
    {
        "order_number": 5,
        "question_text": "What is 25% of 160?",
        "options": [
            {"key": "A", "text": "35"},
            {"key": "B", "text": "40"},
            {"key": "C", "text": "45"},
            {"key": "D", "text": "50"},
        ],
        "correct_answer": "B",
        "difficulty": QuestionDifficulty.BEGINNER,
    },
    {
        "order_number": 6,
        "question_text": "A textbook costs $80. If an educational discount of 15% is applied, what is the final price?",
        "options": [
            {"key": "A", "text": "$64"},
            {"key": "B", "text": "$68"},
            {"key": "C", "text": "$70"},
            {"key": "D", "text": "$72"},
        ],
        "correct_answer": "B",
        "difficulty": QuestionDifficulty.INTERMEDIATE,
    },
    {
        "order_number": 7,
        "question_text": "Solve for x in the equation: 4x + 9 = 33",
        "options": [
            {"key": "A", "text": "x = 5"},
            {"key": "B", "text": "x = 6"},
            {"key": "C", "text": "x = 7"},
            {"key": "D", "text": "x = 8"},
        ],
        "correct_answer": "B",
        "difficulty": QuestionDifficulty.INTERMEDIATE,
    },
    {
        "order_number": 8,
        "question_text": "If 3y - 7 = 2y + 8, what is the value of y?",
        "options": [
            {"key": "A", "text": "y = 12"},
            {"key": "B", "text": "y = 14"},
            {"key": "C", "text": "y = 15"},
            {"key": "D", "text": "y = 16"},
        ],
        "correct_answer": "C",
        "difficulty": QuestionDifficulty.ADVANCED,
    },
    {
        "order_number": 9,
        "question_text": "A right triangle has a base of 6 cm and a height of 8 cm. What is its area?",
        "options": [
            {"key": "A", "text": "20 cm²"},
            {"key": "B", "text": "24 cm²"},
            {"key": "C", "text": "48 cm²"},
            {"key": "D", "text": "14 cm²"},
        ],
        "correct_answer": "B",
        "difficulty": QuestionDifficulty.INTERMEDIATE,
    },
    {
        "order_number": 10,
        "question_text": "Which number completes the sequence: 2, 6, 18, 54, __?",
        "options": [
            {"key": "A", "text": "108"},
            {"key": "B", "text": "144"},
            {"key": "C", "text": "162"},
            {"key": "D", "text": "180"},
        ],
        "correct_answer": "C",
        "difficulty": QuestionDifficulty.ADVANCED,
    },
]


async def seed_demo_user(db: AsyncSession) -> User:
    """
    Safely and idempotently seed the demo learner account with linked profile and preferences.
    """
    stmt = (
        select(User)
        .options(
            selectinload(User.learner_profile).selectinload(LearnerProfile.learning_preference),
            selectinload(User.learner_profile).selectinload(LearnerProfile.accessibility_preference),
        )
        .where(User.email == DEMO_USER_EMAIL)
    )
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        print(f"[DEMO SEED] Demo user '{DEMO_USER_EMAIL}' already exists.")
        return existing_user

    # Create new demo user
    password_hash = get_password_hash(DEMO_USER_PASSWORD_RAW)
    user = User(
        email=DEMO_USER_EMAIL,
        password_hash=password_hash,
        role=UserRole.LEARNER,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    # Create demo learner profile
    profile = LearnerProfile(
        user_id=user.id,
        full_name=DEMO_USER_FULL_NAME,
        age=16,
        grade="10th Grade",
        preferred_language="en",
        learning_pace=LearningPace.MODERATE,
        preferred_content_type=PreferredContentType.VISUAL,
    )
    db.add(profile)
    await db.flush()

    # Create default demo preferences
    learning_pref = LearningPreference(
        learner_profile_id=profile.id,
        visual_explanations=True,
        step_by_step=True,
        simplified_language=False,
        audio_support=False,
        interactive_learning=True,
        short_sessions=False,
    )
    a11y_pref = AccessibilityPreference(
        learner_profile_id=profile.id,
        large_text=False,
        high_contrast=False,
        text_to_speech=False,
        reduced_visual_complexity=False,
        keyboard_navigation=True,
    )
    db.add_all([learning_pref, a11y_pref])
    await db.commit()

    print(f"[DEMO SEED] Successfully created demo user: {DEMO_USER_EMAIL} (Password: {DEMO_USER_PASSWORD_RAW})")
    return user


async def seed_demo_assessment(db: AsyncSession) -> Assessment:
    """
    Safely and idempotently seed the Mathematics baseline diagnostic assessment and 10 questions.
    """
    stmt = (
        select(Assessment)
        .options(selectinload(Assessment.questions))
        .where(Assessment.title == DEMO_ASSESSMENT_TITLE)
    )
    result = await db.execute(stmt)
    existing_assessment = result.scalar_one_or_none()

    if existing_assessment:
        print(f"[DEMO SEED] Assessment '{DEMO_ASSESSMENT_TITLE}' already exists with {len(existing_assessment.questions)} questions.")
        return existing_assessment

    assessment = Assessment(
        title=DEMO_ASSESSMENT_TITLE,
        subject=DEMO_ASSESSMENT_SUBJECT,
        description=DEMO_ASSESSMENT_DESCRIPTION,
        total_questions=len(DEMO_QUESTIONS),
    )
    db.add(assessment)
    await db.flush()

    for q_data in DEMO_QUESTIONS:
        question = AssessmentQuestion(
            assessment_id=assessment.id,
            question_text=q_data["question_text"],
            options=q_data["options"],
            correct_answer=q_data["correct_answer"],
            difficulty=q_data["difficulty"],
            order_number=q_data["order_number"],
        )
        db.add(question)

    await db.commit()
    await db.refresh(assessment)
    print(f"[DEMO SEED] Successfully seeded '{assessment.title}' with {len(DEMO_QUESTIONS)} questions.")
    return assessment


async def seed_all_demo_data(db: AsyncSession):
    """Run all demo seed procedures."""
    print("==================================================")
    print("STARTING SILE DEVELOPMENT & DEMO SEED PROCESS")
    print("==================================================")
    user = await seed_demo_user(db)
    assessment = await seed_demo_assessment(db)
    print("==================================================")
    print("DEMO SEED COMPLETED SUCCESSFULLY!")
    print(f"Demo Credentials: {DEMO_USER_EMAIL} / {DEMO_USER_PASSWORD_RAW}")
    print(f"Assessment Seeded: {assessment.title} ({assessment.total_questions} Questions)")
    print("==================================================")
    return user, assessment


async def main():
    async with async_session_factory() as session:
        await seed_all_demo_data(session)


if __name__ == "__main__":
    asyncio.run(main())
