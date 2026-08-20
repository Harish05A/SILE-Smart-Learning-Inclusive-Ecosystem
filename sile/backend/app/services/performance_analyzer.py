import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.profile import LearnerProfile
from app.models.curriculum import Subject, Topic, ContentDifficulty
from app.models.assessment import AssessmentAttempt, AssessmentAnswer
from app.models.adaptive import TopicPerformance, PracticeAttempt
from app.schemas.performance import (
    MasteryStatus,
    TopicPerformanceMetric,
    LearnerPerformanceOverviewResponse,
)


class PerformanceAnalyzer:
    # Topic code mapping for Phase 1 10-question baseline diagnostic questions
    BASELINE_QUESTION_ORDER_TO_TOPIC_CODE: Dict[int, str] = {
        1: "MATH_NUM",
        2: "MATH_NUM",
        3: "MATH_FRAC",
        4: "MATH_FRAC",
        5: "MATH_PERC",
        6: "MATH_PERC",
        7: "MATH_ALG",
        8: "MATH_ALG",
        9: "MATH_GEOM",
        10: "MATH_GEOM",
    }

    @staticmethod
    def calculate_mastery_score(
        lifetime_accuracy: float,
        recent_accuracy: float,
        total_attempts: int,
    ) -> float:
        """
        Deterministic, explainable rule-based mastery calculation.
        Combines lifetime accuracy (40% weight) and recent accuracy (60% weight).
        If no attempts have been made yet, returns a neutral baseline index of 0.50.
        """
        if total_attempts <= 0:
            return 0.50

        # Weighted blend favoring recent performance trajectory
        blended_percentage = (0.40 * lifetime_accuracy) + (0.60 * recent_accuracy)
        normalized_score = round(max(0.0, min(100.0, blended_percentage)) / 100.0, 3)
        return normalized_score

    @staticmethod
    def determine_mastery_status(mastery_percentage: float) -> MasteryStatus:
        """
        Classification rules:
        < 40%: Low Mastery (Needs Reinforcement / Weak)
        40%–69%: Developing Mastery
        70%–84%: Good Mastery
        85%+: High Mastery (Strong / Mastered)
        """
        if mastery_percentage < 40.0:
            return MasteryStatus.LOW
        elif mastery_percentage < 70.0:
            return MasteryStatus.DEVELOPING
        elif mastery_percentage < 85.0:
            return MasteryStatus.GOOD
        else:
            return MasteryStatus.HIGH

    @staticmethod
    def determine_topic_difficulty(mastery_percentage: float) -> ContentDifficulty:
        """
        Maps mastery to the appropriate content/practice difficulty level.
        """
        if mastery_percentage < 40.0:
            return ContentDifficulty.BEGINNER
        elif mastery_percentage < 70.0:
            return ContentDifficulty.DEVELOPING
        elif mastery_percentage < 85.0:
            return ContentDifficulty.PROFICIENT
        else:
            return ContentDifficulty.ADVANCED

    @classmethod
    async def analyze_learner_performance(
        cls,
        db: AsyncSession,
        learner_profile: LearnerProfile,
    ) -> LearnerPerformanceOverviewResponse:
        """
        Analyzes full historical records (Phase 1 assessments + Phase 2 practice),
        computes topic metrics, synchronizes TopicPerformance records, and categorizes topics.
        """
        # 1. Fetch all topics with their subjects
        topics_stmt = (
            select(Topic)
            .options(selectinload(Topic.subject))
            .order_by(Topic.order_number.asc())
        )
        topics_res = await db.execute(topics_stmt)
        all_topics = list(topics_res.scalars().all())

        # 2. Fetch Phase 1 Assessment attempts with individual answers
        assess_stmt = (
            select(AssessmentAttempt)
            .options(
                selectinload(AssessmentAttempt.answers).selectinload(AssessmentAnswer.question)
            )
            .where(AssessmentAttempt.learner_profile_id == learner_profile.id)
            .order_by(AssessmentAttempt.completed_at.asc())
        )
        assess_res = await db.execute(assess_stmt)
        assessment_attempts = list(assess_res.scalars().all())

        # 3. Fetch Phase 2 Practice attempts
        practice_stmt = (
            select(PracticeAttempt)
            .where(PracticeAttempt.learner_profile_id == learner_profile.id)
            .order_by(PracticeAttempt.completed_at.asc())
        )
        practice_res = await db.execute(practice_stmt)
        practice_attempts = list(practice_res.scalars().all())

        # Organize chronological events by topic_id
        # Tuple: (is_correct: bool, timestamp: datetime)
        topic_events: Dict[uuid.UUID, List[Tuple[bool, datetime]]] = {
            t.id: [] for t in all_topics
        }
        topic_code_to_topic = {t.code: t for t in all_topics}

        # Process Phase 1 baseline assessment answers
        for att in assessment_attempts:
            att_time = att.completed_at or att.started_at
            for ans in att.answers:
                if ans.question and ans.question.order_number in cls.BASELINE_QUESTION_ORDER_TO_TOPIC_CODE:
                    t_code = cls.BASELINE_QUESTION_ORDER_TO_TOPIC_CODE[ans.question.order_number]
                    if t_code in topic_code_to_topic:
                        t = topic_code_to_topic[t_code]
                        topic_events[t.id].append((ans.is_correct, att_time))

        # Process Phase 2 practice attempts
        for pr in practice_attempts:
            if pr.topic_id in topic_events:
                is_correct = pr.percentage >= 60.0
                topic_events[pr.topic_id].append((is_correct, pr.completed_at))

        # 4. Compute metrics for each topic
        strong_topics: List[TopicPerformanceMetric] = []
        developing_topics: List[TopicPerformanceMetric] = []
        weak_topics: List[TopicPerformanceMetric] = []
        all_metrics: List[TopicPerformanceMetric] = []

        total_questions_all = 0
        total_correct_all = 0
        now = datetime.now(timezone.utc)

        for topic in all_topics:
            events = topic_events.get(topic.id, [])
            total_attempts = len(events)
            correct_answers = sum(1 for is_cor, _ in events if is_cor)
            incorrect_answers = total_attempts - correct_answers

            total_questions_all += total_attempts
            total_correct_all += correct_answers

            last_attempted_at = events[-1][1] if events else None

            # Calculate Lifetime Accuracy
            lifetime_accuracy = (
                round((correct_answers / total_attempts) * 100.0, 1)
                if total_attempts > 0
                else 50.0
            )

            # Calculate Recent Accuracy (last 5 attempts)
            recent_window = events[-5:] if events else []
            if recent_window:
                recent_correct = sum(1 for is_cor, _ in recent_window if is_cor)
                recent_accuracy = round((recent_correct / len(recent_window)) * 100.0, 1)
            else:
                recent_accuracy = lifetime_accuracy

            # Calculate Continuous Mastery Score (0.0 - 1.0) & Percentage
            mastery_score = cls.calculate_mastery_score(
                lifetime_accuracy=lifetime_accuracy,
                recent_accuracy=recent_accuracy,
                total_attempts=total_attempts,
            )
            mastery_percentage = round(mastery_score * 100.0, 1)

            # Classify Status & Target Difficulty
            mastery_status = cls.determine_mastery_status(mastery_percentage)
            current_difficulty = cls.determine_topic_difficulty(mastery_percentage)

            # Synchronize/Upsert in DB TopicPerformance table
            perf_stmt = select(TopicPerformance).where(
                TopicPerformance.learner_profile_id == learner_profile.id,
                TopicPerformance.topic_id == topic.id,
            )
            perf_res = await db.execute(perf_stmt)
            perf_record = perf_res.scalar_one_or_none()

            if not perf_record:
                perf_record = TopicPerformance(
                    learner_profile_id=learner_profile.id,
                    topic_id=topic.id,
                    attempts=total_attempts,
                    correct_answers=correct_answers,
                    accuracy=lifetime_accuracy,
                    current_difficulty=current_difficulty,
                    mastery_score=mastery_score,
                    last_attempted_at=last_attempted_at,
                )
                db.add(perf_record)
            else:
                perf_record.attempts = total_attempts
                perf_record.correct_answers = correct_answers
                perf_record.accuracy = lifetime_accuracy
                perf_record.current_difficulty = current_difficulty
                perf_record.mastery_score = mastery_score
                perf_record.last_attempted_at = last_attempted_at

            metric = TopicPerformanceMetric(
                topic_id=topic.id,
                topic_code=topic.code,
                topic_name=topic.name,
                subject_name=topic.subject.name if topic.subject else "Mathematics",
                total_attempts=total_attempts,
                correct_answers=correct_answers,
                incorrect_answers=incorrect_answers,
                accuracy=lifetime_accuracy,
                recent_accuracy=recent_accuracy,
                mastery_score=mastery_score,
                mastery_percentage=mastery_percentage,
                mastery_status=mastery_status,
                current_difficulty=current_difficulty,
                last_attempted_at=last_attempted_at,
            )

            all_metrics.append(metric)

            if mastery_status in [MasteryStatus.HIGH, MasteryStatus.GOOD]:
                strong_topics.append(metric)
            elif mastery_status == MasteryStatus.DEVELOPING:
                developing_topics.append(metric)
            else:
                weak_topics.append(metric)

        await db.commit()

        overall_accuracy = (
            round((total_correct_all / total_questions_all) * 100.0, 1)
            if total_questions_all > 0
            else 50.0
        )
        overall_mastery = (
            round(sum(m.mastery_percentage for m in all_metrics) / len(all_metrics), 1)
            if all_metrics
            else 50.0
        )

        return LearnerPerformanceOverviewResponse(
            learner_id=learner_profile.id,
            full_name=learner_profile.full_name,
            overall_accuracy=overall_accuracy,
            overall_mastery=overall_mastery,
            total_questions_attempted=total_questions_all,
            strong_topics=strong_topics,
            developing_topics=developing_topics,
            weak_topics=weak_topics,
            all_topics=all_metrics,
            last_analyzed_at=now,
        )

    @classmethod
    async def get_weak_topics(
        cls, db: AsyncSession, learner_profile: LearnerProfile
    ) -> List[TopicPerformanceMetric]:
        """Convenience method for Recommendation and Path Generators."""
        overview = await cls.analyze_learner_performance(db, learner_profile)
        return overview.weak_topics

    @classmethod
    async def get_strong_topics(
        cls, db: AsyncSession, learner_profile: LearnerProfile
    ) -> List[TopicPerformanceMetric]:
        """Convenience method for Recommendation and Path Generators."""
        overview = await cls.analyze_learner_performance(db, learner_profile)
        return overview.strong_topics
