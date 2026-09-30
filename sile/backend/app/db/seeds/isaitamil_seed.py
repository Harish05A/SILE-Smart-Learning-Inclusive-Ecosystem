"""
==============================================================================
ISAITAMIL DEMO LEARNER SEED (DEVELOPMENT / PRESENTATION ONLY)
==============================================================================

Creates a rich, presentation-ready demo learner named "Isaitamil" with:
  * A distinctive LearnerProfile (slow pace, visual learner, simplified language)
  * Learning + Accessibility preferences that visibly drive content adaptation
  * Pre-populated performance history (TopicPerformance) so the AI clearly has
    STRONG topics (Number System, Fractions) and WEAK topics
    (Percentages, Basic Algebra, Geometry)
  * Recent PracticeAttempt history feeding the LearnerAnalysisAgent
  * A completed AssessmentAttempt with per-question answers

Because the multi-agent content pipeline derives `weak_topics`, `strong_topics`,
`overall_mastery`, and `recommended_difficulty` from TopicPerformance +
PracticeAttempt, seeding these tables is what makes the generated content
demonstrably reflect Isaitamil's profile during the demo.

The seed is fully idempotent: it early-returns if the account already exists.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.profile import LearnerProfile, LearningPace, PreferredContentType
from app.models.preference import LearningPreference
from app.models.accessibility import AccessibilityPreference
from app.models.curriculum import Topic, LearningContent, ContentDifficulty
from app.models.adaptive import (
    TopicPerformance,
    LearningRecommendation,
    RecommendationPriority,
    RecommendationStatus,
)
from app.models.assessment import (
    Assessment,
    AssessmentQuestion,
    AssessmentAttempt,
    AssessmentAnswer,
    LearningLevel,
)

# ==============================================================================
# ACCOUNT CONFIGURATION
# ==============================================================================

ISAITAMIL_EMAIL = "isaitamil@sile.org"
ISAITAMIL_PASSWORD_RAW = "Isaitamil123"  # Development / demo presentation only
ISAITAMIL_FULL_NAME = "Isaitamil"

# Distinctive profile so reviewers can trace adaptation decisions back to it
ISAITAMIL_AGE = 14
ISAITAMIL_GRADE = "8th Grade"
ISAITAMIL_LANGUAGE = "en"
ISAITAMIL_PACE = LearningPace.SLOW
ISAITAMIL_CONTENT_TYPE = PreferredContentType.VISUAL

# Learning preferences: visual, step-by-step, simplified language, short sessions.
# These flags are read verbatim by the ContentAdaptationAgent prompt.
ISAITAMIL_LEARNING_PREFS = dict(
    visual_explanations=True,
    step_by_step=True,
    simplified_language=True,
    audio_support=True,
    interactive_learning=True,
    short_sessions=True,
)

# Accessibility preferences: larger text, text-to-speech, reduced visual clutter.
ISAITAMIL_A11Y_PREFS = dict(
    large_text=True,
    high_contrast=True,
    text_to_speech=True,
    reduced_visual_complexity=True,
    keyboard_navigation=True,
)

# ------------------------------------------------------------------------------
# Performance profile keyed by curriculum Topic.code
#   High mastery on foundations -> "strong_topics"
#   Low/developing mastery on later topics -> "weak_topics" + learning gaps
# ------------------------------------------------------------------------------
ISAITAMIL_TOPIC_PERFORMANCE: Dict[str, Dict] = {
    "MATH_NUM": {  # Number System - STRONG
        "attempts": 24,
        "correct_answers": 22,
        "accuracy": 91.7,
        "mastery_score": 0.90,
        "current_difficulty": ContentDifficulty.PROFICIENT,
    },
    "MATH_FRAC": {  # Fractions - STRONG
        "attempts": 20,
        "correct_answers": 17,
        "accuracy": 85.0,
        "mastery_score": 0.82,
        "current_difficulty": ContentDifficulty.PROFICIENT,
    },
    "MATH_PERC": {  # Percentages - WEAK
        "attempts": 16,
        "correct_answers": 6,
        "accuracy": 37.5,
        "mastery_score": 0.35,
        "current_difficulty": ContentDifficulty.BEGINNER,
    },
    "MATH_ALG": {  # Basic Algebra - WEAK
        "attempts": 14,
        "correct_answers": 4,
        "accuracy": 28.6,
        "mastery_score": 0.26,
        "current_difficulty": ContentDifficulty.BEGINNER,
    },
    "MATH_GEOM": {  # Geometry - DEVELOPING
        "attempts": 12,
        "correct_answers": 6,
        "accuracy": 50.0,
        "mastery_score": 0.48,
        "current_difficulty": ContentDifficulty.DEVELOPING,
    },
}

# Recent practice sessions (most recent first). Difficulty + percentage feed the
# LearnerAnalysisAgent's recent-performance summary.
ISAITAMIL_PRACTICE_HISTORY: List[Dict] = [
    {"topic_code": "MATH_ALG", "percentage": 30.0, "difficulty": ContentDifficulty.BEGINNER, "days_ago": 1},
    {"topic_code": "MATH_PERC", "percentage": 40.0, "difficulty": ContentDifficulty.BEGINNER, "days_ago": 2},
    {"topic_code": "MATH_GEOM", "percentage": 50.0, "difficulty": ContentDifficulty.DEVELOPING, "days_ago": 3},
    {"topic_code": "MATH_FRAC", "percentage": 85.0, "difficulty": ContentDifficulty.PROFICIENT, "days_ago": 5},
    {"topic_code": "MATH_NUM", "percentage": 92.0, "difficulty": ContentDifficulty.PROFICIENT, "days_ago": 6},
    {"topic_code": "MATH_ALG", "percentage": 25.0, "difficulty": ContentDifficulty.BEGINNER, "days_ago": 8},
]

# Recommendations shown on the dashboard (weak topics prioritized).
ISAITAMIL_RECOMMENDATIONS: List[Dict] = [
    {
        "topic_code": "MATH_ALG",
        "reason": "Accuracy on Basic Algebra is 28.6% across 14 attempts. Revisit one-step equations with step-by-step visual scaffolding.",
        "priority": RecommendationPriority.HIGH,
    },
    {
        "topic_code": "MATH_PERC",
        "reason": "Percentages mastery is 35%. Reinforce 'percent of a value' using simplified language and worked examples.",
        "priority": RecommendationPriority.HIGH,
    },
    {
        "topic_code": "MATH_GEOM",
        "reason": "Geometry accuracy is developing at 50%. Practice area of composite figures with reduced visual complexity.",
        "priority": RecommendationPriority.MEDIUM,
    },
]

DEMO_ASSESSMENT_TITLE = "Foundational Mathematics Baseline Diagnostic [DEMO]"


async def _load_topics_by_code(db: AsyncSession) -> Dict[str, Topic]:
    """Return a {code: Topic} map for the seeded Mathematics curriculum."""
    result = await db.execute(select(Topic))
    return {t.code: t for t in result.scalars().all()}


async def _seed_topic_performance(
    db: AsyncSession, profile: LearnerProfile, topics_by_code: Dict[str, Topic]
) -> None:
    for code, data in ISAITAMIL_TOPIC_PERFORMANCE.items():
        topic = topics_by_code.get(code)
        if not topic:
            continue
        db.add(
            TopicPerformance(
                learner_profile_id=profile.id,
                topic_id=topic.id,
                attempts=data["attempts"],
                correct_answers=data["correct_answers"],
                accuracy=data["accuracy"],
                current_difficulty=data["current_difficulty"],
                mastery_score=data["mastery_score"],
                last_attempted_at=datetime.now(timezone.utc) - timedelta(days=1),
            )
        )


async def _seed_practice_history(
    db: AsyncSession, profile: LearnerProfile, topics_by_code: Dict[str, Topic]
) -> None:
    from app.models.adaptive import PracticeAttempt

    for entry in ISAITAMIL_PRACTICE_HISTORY:
        topic = topics_by_code.get(entry["topic_code"])
        if not topic:
            continue
        pct = entry["percentage"]
        db.add(
            PracticeAttempt(
                learner_profile_id=profile.id,
                topic_id=topic.id,
                content_id=None,
                score=round(pct / 10.0, 1),  # score out of 10
                percentage=pct,
                difficulty=entry["difficulty"],
                answers_payload={
                    "summary": f"{int(pct)}% correct",
                    "topic": topic.name,
                },
                completed_at=datetime.now(timezone.utc) - timedelta(days=entry["days_ago"]),
            )
        )


async def _seed_recommendations(
    db: AsyncSession, profile: LearnerProfile, topics_by_code: Dict[str, Topic]
) -> None:
    for rec in ISAITAMIL_RECOMMENDATIONS:
        topic = topics_by_code.get(rec["topic_code"])
        if not topic:
            continue
        db.add(
            LearningRecommendation(
                learner_profile_id=profile.id,
                topic_id=topic.id,
                content_id=None,
                reason=rec["reason"],
                priority=rec["priority"],
                status=RecommendationStatus.PENDING,
            )
        )


async def _seed_assessment_attempt(db: AsyncSession, profile: LearnerProfile) -> None:
    """Attach a completed baseline diagnostic attempt using the existing demo assessment."""
    stmt = (
        select(Assessment)
        .options(selectinload(Assessment.questions))
        .where(Assessment.title == DEMO_ASSESSMENT_TITLE)
    )
    result = await db.execute(stmt)
    assessment: Optional[Assessment] = result.scalar_one_or_none()
    if not assessment or not assessment.questions:
        print("[ISAITAMIL SEED] Baseline assessment not found; skipping attempt history.")
        return

    questions = sorted(assessment.questions, key=lambda q: q.order_number)
    total = len(questions)

    # Isaitamil is strong on the early (arithmetic/fraction) items and weak on the
    # later (percentage/algebra/geometry) items -> mirrors topic performance.
    correct_through = max(1, int(round(total * 0.5)))  # first ~half correct

    attempt = AssessmentAttempt(
        learner_profile_id=profile.id,
        assessment_id=assessment.id,
        score=float(correct_through),
        percentage=round((correct_through / total) * 100, 1),
        learning_level=LearningLevel.DEVELOPING,
        started_at=datetime.now(timezone.utc) - timedelta(days=7, minutes=18),
        completed_at=datetime.now(timezone.utc) - timedelta(days=7),
    )
    db.add(attempt)
    await db.flush()

    for idx, q in enumerate(questions):
        is_correct = idx < correct_through
        if is_correct:
            selected = q.correct_answer
        else:
            # pick a plausible wrong option key
            selected = "A" if q.correct_answer != "A" else "B"
        db.add(
            AssessmentAnswer(
                attempt_id=attempt.id,
                question_id=q.id,
                selected_answer=selected,
                is_correct=is_correct,
            )
        )


async def seed_isaitamil_learner(db: AsyncSession) -> User:
    """Idempotently seed the Isaitamil demo learner with full history."""
    stmt = (
        select(User)
        .options(
            selectinload(User.learner_profile).selectinload(LearnerProfile.learning_preference),
            selectinload(User.learner_profile).selectinload(LearnerProfile.accessibility_preference),
        )
        .where(User.email == ISAITAMIL_EMAIL)
    )
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()
    if existing_user:
        print(f"[ISAITAMIL SEED] Learner '{ISAITAMIL_EMAIL}' already exists.")
        return existing_user

    # 1. User account
    user = User(
        email=ISAITAMIL_EMAIL,
        password_hash=get_password_hash(ISAITAMIL_PASSWORD_RAW),
        role=UserRole.LEARNER,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    # 2. Learner profile
    profile = LearnerProfile(
        user_id=user.id,
        full_name=ISAITAMIL_FULL_NAME,
        age=ISAITAMIL_AGE,
        grade=ISAITAMIL_GRADE,
        preferred_language=ISAITAMIL_LANGUAGE,
        learning_pace=ISAITAMIL_PACE,
        preferred_content_type=ISAITAMIL_CONTENT_TYPE,
    )
    db.add(profile)
    await db.flush()

    # 3. Preferences
    db.add(LearningPreference(learner_profile_id=profile.id, **ISAITAMIL_LEARNING_PREFS))
    db.add(AccessibilityPreference(learner_profile_id=profile.id, **ISAITAMIL_A11Y_PREFS))

    # 4. Pre-populated history so the AI clearly reflects the profile
    topics_by_code = await _load_topics_by_code(db)
    await _seed_topic_performance(db, profile, topics_by_code)
    await _seed_practice_history(db, profile, topics_by_code)
    await _seed_recommendations(db, profile, topics_by_code)
    await _seed_assessment_attempt(db, profile)

    await db.commit()

    print(
        f"[ISAITAMIL SEED] Created learner: {ISAITAMIL_EMAIL} / {ISAITAMIL_PASSWORD_RAW}\n"
        f"                 Profile: {ISAITAMIL_FULL_NAME}, {ISAITAMIL_GRADE}, "
        f"pace={ISAITAMIL_PACE.value}, mode={ISAITAMIL_CONTENT_TYPE.value}\n"
        f"                 Strong: Number System, Fractions | Weak: Percentages, Basic Algebra, Geometry\n"
        f"                 Seeded {len(ISAITAMIL_TOPIC_PERFORMANCE)} topic-performance rows, "
        f"{len(ISAITAMIL_PRACTICE_HISTORY)} practice attempts, "
        f"{len(ISAITAMIL_RECOMMENDATIONS)} recommendations, 1 assessment attempt."
    )
    return user
