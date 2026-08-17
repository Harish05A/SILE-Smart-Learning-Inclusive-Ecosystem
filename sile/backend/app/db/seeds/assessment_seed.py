import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session_factory
from app.models.assessment import Assessment, AssessmentQuestion, QuestionDifficulty

MATH_ASSESSMENT_TITLE = "Foundational Mathematics Baseline Diagnostic"
MATH_ASSESSMENT_SUBJECT = "Mathematics"
MATH_ASSESSMENT_DESCRIPTION = (
    "A 10-question foundational diagnostic assessing arithmetic, fractions, percentages, "
    "elementary algebra, geometry, and pattern recognition to personalize your learning trajectory."
)

QUESTIONS_DATA = [
    {
        "order_number": 1,
        "question_text": "What is 248 + 175?",
        "options": [
            {"key": "A", "text": "413"},
            {"key": "B", "text": "423"},
            {"key": "C", "text": "433"},
            {"key": "D", "text": "415"},
        ],
        "correct_answer": "B",
        "difficulty": QuestionDifficulty.BEGINNER,
    },
    {
        "order_number": 2,
        "question_text": "Calculate: (144 ÷ 12) × 3",
        "options": [
            {"key": "A", "text": "36"},
            {"key": "B", "text": "24"},
            {"key": "C", "text": "48"},
            {"key": "D", "text": "16"},
        ],
        "correct_answer": "A",
        "difficulty": QuestionDifficulty.BEGINNER,
    },
    {
        "order_number": 3,
        "question_text": "What is 2/5 + 1/10 expressed in simplest fractional form?",
        "options": [
            {"key": "A", "text": "3/15"},
            {"key": "B", "text": "1/2"},
            {"key": "C", "text": "3/10"},
            {"key": "D", "text": "4/10"},
        ],
        "correct_answer": "B",
        "difficulty": QuestionDifficulty.INTERMEDIATE,
    },
    {
        "order_number": 4,
        "question_text": "What is 3/4 × 2/3 in simplest form?",
        "options": [
            {"key": "A", "text": "1/2"},
            {"key": "B", "text": "5/7"},
            {"key": "C", "text": "6/12"},
            {"key": "D", "text": "2/3"},
        ],
        "correct_answer": "A",
        "difficulty": QuestionDifficulty.INTERMEDIATE,
    },
    {
        "order_number": 5,
        "question_text": "What is 15% of 80?",
        "options": [
            {"key": "A", "text": "10"},
            {"key": "B", "text": "12"},
            {"key": "C", "text": "14"},
            {"key": "D", "text": "15"},
        ],
        "correct_answer": "B",
        "difficulty": QuestionDifficulty.INTERMEDIATE,
    },
    {
        "order_number": 6,
        "question_text": "A book normally costs $50. If it is discounted by 20%, what is the final price?",
        "options": [
            {"key": "A", "text": "$30"},
            {"key": "B", "text": "$35"},
            {"key": "C", "text": "$40"},
            {"key": "D", "text": "$45"},
        ],
        "correct_answer": "C",
        "difficulty": QuestionDifficulty.INTERMEDIATE,
    },
    {
        "order_number": 7,
        "question_text": "Solve for x in the equation: 3x + 7 = 22",
        "options": [
            {"key": "A", "text": "x = 3"},
            {"key": "B", "text": "x = 4"},
            {"key": "C", "text": "x = 5"},
            {"key": "D", "text": "x = 6"},
        ],
        "correct_answer": "C",
        "difficulty": QuestionDifficulty.INTERMEDIATE,
    },
    {
        "order_number": 8,
        "question_text": "If 2y - 4 = 10, what is the value of y?",
        "options": [
            {"key": "A", "text": "y = 5"},
            {"key": "B", "text": "y = 6"},
            {"key": "C", "text": "y = 7"},
            {"key": "D", "text": "y = 8"},
        ],
        "correct_answer": "C",
        "difficulty": QuestionDifficulty.INTERMEDIATE,
    },
    {
        "order_number": 9,
        "question_text": "A rectangle has a length of 8 cm and a width of 5 cm. What is its area?",
        "options": [
            {"key": "A", "text": "26 cm²"},
            {"key": "B", "text": "40 cm²"},
            {"key": "C", "text": "35 cm²"},
            {"key": "D", "text": "48 cm²"},
        ],
        "correct_answer": "B",
        "difficulty": QuestionDifficulty.BEGINNER,
    },
    {
        "order_number": 10,
        "question_text": "What is the next number in the sequence: 3, 7, 11, 15, __?",
        "options": [
            {"key": "A", "text": "17"},
            {"key": "B", "text": "18"},
            {"key": "C", "text": "19"},
            {"key": "D", "text": "21"},
        ],
        "correct_answer": "C",
        "difficulty": QuestionDifficulty.BEGINNER,
    },
]


async def seed_math_assessment(db: AsyncSession) -> Assessment:
    stmt = select(Assessment).where(Assessment.title == MATH_ASSESSMENT_TITLE)
    result = await db.execute(stmt)
    existing_assessment = result.scalar_one_or_none()

    if existing_assessment:
        return existing_assessment

    assessment = Assessment(
        title=MATH_ASSESSMENT_TITLE,
        subject=MATH_ASSESSMENT_SUBJECT,
        description=MATH_ASSESSMENT_DESCRIPTION,
        total_questions=len(QUESTIONS_DATA),
    )
    db.add(assessment)
    await db.flush()

    for q_data in QUESTIONS_DATA:
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
    print(f"[SEED SUCCESS] Seeded '{assessment.title}' with {len(QUESTIONS_DATA)} questions.")
    return assessment


async def main():
    async with async_session_factory() as session:
        await seed_math_assessment(session)


if __name__ == "__main__":
    asyncio.run(main())
