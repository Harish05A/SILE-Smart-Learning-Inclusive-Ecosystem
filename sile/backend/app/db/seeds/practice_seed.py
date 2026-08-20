import asyncio
from typing import List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.models.curriculum import Subject, Topic, ContentDifficulty
from app.models.practice import PracticeQuestion

# ==============================================================================
# PHASE 2 ADAPTIVE PRACTICE QUESTIONS DATASET
# ==============================================================================

PRACTICE_QUESTIONS_DATA: List[Dict[str, Any]] = [
    # --------------------------------------------------------------------------
    # 1. Number System (MATH_NUM)
    # --------------------------------------------------------------------------
    {
        "topic_code": "MATH_NUM",
        "question_text": "What is the place value of the digit 7 in 47,820?",
        "options": [
            {"key": "A", "text": "70"},
            {"key": "B", "text": "700"},
            {"key": "C", "text": "7,000"},
            {"key": "D", "text": "70,000"},
        ],
        "correct_answer": "C",
        "difficulty": ContentDifficulty.BEGINNER,
        "explanation": "In 47,820, 7 is in the thousands place, so its value is 7,000.",
    },
    {
        "topic_code": "MATH_NUM",
        "question_text": "Which of the following numbers is a prime number?",
        "options": [
            {"key": "A", "text": "21"},
            {"key": "B", "text": "29"},
            {"key": "C", "text": "35"},
            {"key": "D", "text": "49"},
        ],
        "correct_answer": "B",
        "difficulty": ContentDifficulty.DEVELOPING,
        "explanation": "29 has only two factors: 1 and 29. 21=3x7, 35=5x7, 49=7x7.",
    },
    {
        "topic_code": "MATH_NUM",
        "question_text": "Evaluate the expression using PEMDAS: 12 + 6 × (8 - 3) ÷ 3",
        "options": [
            {"key": "A", "text": "22"},
            {"key": "B", "text": "30"},
            {"key": "C", "text": "18"},
            {"key": "D", "text": "24"},
        ],
        "correct_answer": "A",
        "difficulty": ContentDifficulty.PROFICIENT,
        "explanation": "1) (8 - 3) = 5; 2) 6 × 5 = 30; 3) 30 ÷ 3 = 10; 4) 12 + 10 = 22.",
    },
    {
        "topic_code": "MATH_NUM",
        "question_text": "Find the Least Common Multiple (LCM) of 12 and 18.",
        "options": [
            {"key": "A", "text": "6"},
            {"key": "B", "text": "36"},
            {"key": "C", "text": "72"},
            {"key": "D", "text": "54"},
        ],
        "correct_answer": "B",
        "difficulty": ContentDifficulty.ADVANCED,
        "explanation": "Multiples of 12: 12, 24, 36, 48... Multiples of 18: 18, 36... LCM is 36.",
    },

    # --------------------------------------------------------------------------
    # 2. Fractions (MATH_FRAC)
    # --------------------------------------------------------------------------
    {
        "topic_code": "MATH_FRAC",
        "question_text": "In the fraction 5/9, what is the numerator?",
        "options": [
            {"key": "A", "text": "5"},
            {"key": "B", "text": "9"},
            {"key": "C", "text": "14"},
            {"key": "D", "text": "4"},
        ],
        "correct_answer": "A",
        "difficulty": ContentDifficulty.BEGINNER,
        "explanation": "The numerator is the top number representing the parts counted (5).",
    },
    {
        "topic_code": "MATH_FRAC",
        "question_text": "Which fraction is equivalent to 3/4?",
        "options": [
            {"key": "A", "text": "6/12"},
            {"key": "B", "text": "9/12"},
            {"key": "C", "text": "12/20"},
            {"key": "D", "text": "6/10"},
        ],
        "correct_answer": "B",
        "difficulty": ContentDifficulty.DEVELOPING,
        "explanation": "Multiplying numerator and denominator by 3: (3×3)/(4×3) = 9/12.",
    },
    {
        "topic_code": "MATH_FRAC",
        "question_text": "What is 2/3 + 1/4 in simplest form?",
        "options": [
            {"key": "A", "text": "3/7"},
            {"key": "B", "text": "11/12"},
            {"key": "C", "text": "8/12"},
            {"key": "D", "text": "5/6"},
        ],
        "correct_answer": "B",
        "difficulty": ContentDifficulty.PROFICIENT,
        "explanation": "LCD is 12: 2/3 = 8/12, 1/4 = 3/12. 8/12 + 3/12 = 11/12.",
    },
    {
        "topic_code": "MATH_FRAC",
        "question_text": "A baker has 5/6 kg of sugar. She uses 2/3 of it for a cake. How much sugar was used?",
        "options": [
            {"key": "A", "text": "5/9 kg"},
            {"key": "B", "text": "1/2 kg"},
            {"key": "C", "text": "7/18 kg"},
            {"key": "D", "text": "10/18 kg"},
        ],
        "correct_answer": "A",
        "difficulty": ContentDifficulty.ADVANCED,
        "explanation": "Multiply: (5/6) × (2/3) = 10/18 = 5/9 kg.",
    },

    # --------------------------------------------------------------------------
    # 3. Percentages (MATH_PERC)
    # --------------------------------------------------------------------------
    {
        "topic_code": "MATH_PERC",
        "question_text": "What is 35% written as a fraction in simplest form?",
        "options": [
            {"key": "A", "text": "35/10"},
            {"key": "B", "text": "7/20"},
            {"key": "C", "text": "3/5"},
            {"key": "D", "text": "7/10"},
        ],
        "correct_answer": "B",
        "difficulty": ContentDifficulty.BEGINNER,
        "explanation": "35% = 35/100. Divide top and bottom by 5: 35/100 = 7/20.",
    },
    {
        "topic_code": "MATH_PERC",
        "question_text": "Convert 0.625 into a percentage.",
        "options": [
            {"key": "A", "text": "6.25%"},
            {"key": "B", "text": "62.5%"},
            {"key": "C", "text": "625%"},
            {"key": "D", "text": "0.625%"},
        ],
        "correct_answer": "B",
        "difficulty": ContentDifficulty.DEVELOPING,
        "explanation": "Multiply by 100: 0.625 × 100% = 62.5%.",
    },
    {
        "topic_code": "MATH_PERC",
        "question_text": "What is 15% of $140?",
        "options": [
            {"key": "A", "text": "$18"},
            {"key": "B", "text": "$21"},
            {"key": "C", "text": "$24"},
            {"key": "D", "text": "$28"},
        ],
        "correct_answer": "B",
        "difficulty": ContentDifficulty.PROFICIENT,
        "explanation": "10% of 140 is 14; 5% is 7. 14 + 7 = $21 (or 0.15 × 140 = 21).",
    },
    {
        "topic_code": "MATH_PERC",
        "question_text": "A $200 jacket is on sale for 30% off, and sales tax is 5%. What is the final price?",
        "options": [
            {"key": "A", "text": "$140"},
            {"key": "B", "text": "$147"},
            {"key": "C", "text": "$150"},
            {"key": "D", "text": "$154"},
        ],
        "correct_answer": "B",
        "difficulty": ContentDifficulty.ADVANCED,
        "explanation": "Discount: 200 × 0.30 = $60 -> $140. Tax: 140 × 0.05 = $7 -> $147.",
    },

    # --------------------------------------------------------------------------
    # 4. Basic Algebra (MATH_ALG)
    # --------------------------------------------------------------------------
    {
        "topic_code": "MATH_ALG",
        "question_text": "If n = 6, what is the value of 4n - 7?",
        "options": [
            {"key": "A", "text": "17"},
            {"key": "B", "text": "24"},
            {"key": "C", "text": "31"},
            {"key": "D", "text": "11"},
        ],
        "correct_answer": "A",
        "difficulty": ContentDifficulty.BEGINNER,
        "explanation": "Substitute n=6: 4(6) - 7 = 24 - 7 = 17.",
    },
    {
        "topic_code": "MATH_ALG",
        "question_text": "Solve for x: x - 14 = 28",
        "options": [
            {"key": "A", "text": "x = 14"},
            {"key": "B", "text": "x = 42"},
            {"key": "C", "text": "x = 32"},
            {"key": "D", "text": "x = 2"},
        ],
        "correct_answer": "B",
        "difficulty": ContentDifficulty.DEVELOPING,
        "explanation": "Add 14 to both sides: x = 28 + 14 = 42.",
    },
    {
        "topic_code": "MATH_ALG",
        "question_text": "Solve for y: 5y + 12 = 47",
        "options": [
            {"key": "A", "text": "y = 6"},
            {"key": "B", "text": "y = 7"},
            {"key": "C", "text": "y = 8"},
            {"key": "D", "text": "y = 9"},
        ],
        "correct_answer": "B",
        "difficulty": ContentDifficulty.PROFICIENT,
        "explanation": "5y = 47 - 12 = 35 -> y = 35 / 5 = 7.",
    },
    {
        "topic_code": "MATH_ALG",
        "question_text": "Solve the inequality: 3x - 5 ≥ 16",
        "options": [
            {"key": "A", "text": "x ≥ 7"},
            {"key": "B", "text": "x ≥ 21"},
            {"key": "C", "text": "x ≤ 7"},
            {"key": "D", "text": "x ≥ 9"},
        ],
        "correct_answer": "A",
        "difficulty": ContentDifficulty.ADVANCED,
        "explanation": "3x ≥ 16 + 5 = 21 -> x ≥ 7.",
    },

    # --------------------------------------------------------------------------
    # 5. Geometry (MATH_GEOM)
    # --------------------------------------------------------------------------
    {
        "topic_code": "MATH_GEOM",
        "question_text": "How many degrees do the angles in any triangle always sum to?",
        "options": [
            {"key": "A", "text": "90°"},
            {"key": "B", "text": "180°"},
            {"key": "C", "text": "270°"},
            {"key": "D", "text": "360°"},
        ],
        "correct_answer": "B",
        "difficulty": ContentDifficulty.BEGINNER,
        "explanation": "The sum of the three interior angles of a triangle is always 180°.",
    },
    {
        "topic_code": "MATH_GEOM",
        "question_text": "What is the perimeter of a rectangle with length 12 cm and width 7 cm?",
        "options": [
            {"key": "A", "text": "19 cm"},
            {"key": "B", "text": "38 cm"},
            {"key": "C", "text": "84 cm"},
            {"key": "D", "text": "48 cm"},
        ],
        "correct_answer": "B",
        "difficulty": ContentDifficulty.DEVELOPING,
        "explanation": "Perimeter = 2 × (12 + 7) = 2 × 19 = 38 cm.",
    },
    {
        "topic_code": "MATH_GEOM",
        "question_text": "What is the area of a right-angled triangle with base 10 m and height 8 m?",
        "options": [
            {"key": "A", "text": "80 m²"},
            {"key": "B", "text": "40 m²"},
            {"key": "C", "text": "18 m²"},
            {"key": "D", "text": "26 m²"},
        ],
        "correct_answer": "B",
        "difficulty": ContentDifficulty.PROFICIENT,
        "explanation": "Area = (1/2) × base × height = (1/2) × 10 × 8 = 40 m².",
    },
    {
        "topic_code": "MATH_GEOM",
        "question_text": "A square garden has an area of 144 m². What is its perimeter?",
        "options": [
            {"key": "A", "text": "24 m"},
            {"key": "B", "text": "36 m"},
            {"key": "C", "text": "48 m"},
            {"key": "D", "text": "60 m"},
        ],
        "correct_answer": "C",
        "difficulty": ContentDifficulty.ADVANCED,
        "explanation": "Side = √144 = 12 m. Perimeter = 4 × 12 = 48 m.",
    },
]


async def seed_practice_questions(db: AsyncSession):
    """
    Safely and idempotently seed practice questions across all Mathematics topics and difficulty levels.
    """
    print("[PRACTICE SEED] Checking practice questions...")

    # Load all topics by code
    topic_stmt = select(Topic)
    topic_res = await db.execute(topic_stmt)
    topics = topic_res.scalars().all()
    topic_map = {t.code: t for t in topics}

    count_added = 0
    for q_data in PRACTICE_QUESTIONS_DATA:
        t_code = q_data["topic_code"]
        if t_code not in topic_map:
            continue

        topic = topic_map[t_code]

        # Check existing
        q_stmt = select(PracticeQuestion).where(
            PracticeQuestion.topic_id == topic.id,
            PracticeQuestion.question_text == q_data["question_text"],
        )
        q_res = await db.execute(q_stmt)
        existing = q_res.scalar_one_or_none()

        if not existing:
            pq = PracticeQuestion(
                subject_id=topic.subject_id,
                topic_id=topic.id,
                question_text=q_data["question_text"],
                options=q_data["options"],
                correct_answer=q_data["correct_answer"],
                difficulty=q_data["difficulty"],
                explanation=q_data.get("explanation"),
                hint=q_data.get("hint"),
            )
            db.add(pq)
            count_added += 1

    await db.commit()
    print(f"[PRACTICE SEED] Seeded/verified {len(PRACTICE_QUESTIONS_DATA)} practice questions across 5 topics and 4 difficulty levels.")


async def main():
    async with async_session_factory() as session:
        await seed_practice_questions(session)


if __name__ == "__main__":
    asyncio.run(main())
