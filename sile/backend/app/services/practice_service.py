import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import EntityNotFoundException, ValidationException
from app.models.profile import LearnerProfile
from app.models.curriculum import Topic, ContentDifficulty
from app.models.practice import PracticeQuestion
from app.models.adaptive import (
    PracticeAttempt,
    TopicPerformance,
    LearningPath,
    LearningPathItem,
    PathItemStatus,
)
from app.schemas.practice import (
    PracticeSessionResponse,
    PracticeQuestionResponse,
    SubmitPracticeSessionRequest,
    PracticeResultResponse,
    QuestionReviewItem,
)
from app.services.performance_analyzer import PerformanceAnalyzer
from app.services.recommendation_engine import RecommendationEngine


class PracticeService:
    @classmethod
    async def generate_practice_session(
        cls,
        db: AsyncSession,
        learner_profile: LearnerProfile,
        topic_id: uuid.UUID,
        num_questions: int = 5,
    ) -> PracticeSessionResponse:
        # 1. Fetch Topic
        topic_stmt = select(Topic).where(Topic.id == topic_id)
        topic_res = await db.execute(topic_stmt)
        topic = topic_res.scalar_one_or_none()
        if not topic:
            raise EntityNotFoundException("Topic", topic_id)

        # 2. Analyze Current Topic Mastery to calibrate difficulty
        overview = await PerformanceAnalyzer.analyze_learner_performance(db, learner_profile)
        topic_metric = next((m for m in overview.all_topics if m.topic_id == topic.id), None)
        mastery_pct = topic_metric.mastery_percentage if topic_metric else 50.0

        # Calibrated difficulty rules:
        # < 40% -> beginner
        # 40%–69% -> developing
        # 70%–84% -> proficient
        # 85%+ -> advanced
        calibrated_diff = PerformanceAnalyzer.determine_topic_difficulty(mastery_pct)

        # 3. Query questions matching topic and calibrated difficulty
        q_stmt = select(PracticeQuestion).where(
            PracticeQuestion.topic_id == topic.id,
            PracticeQuestion.difficulty == calibrated_diff,
        ).order_by(PracticeQuestion.order_number.asc())
        q_res = await db.execute(q_stmt)
        questions = list(q_res.scalars().all())

        # If not enough at exact difficulty, supplement with other questions in this topic
        if len(questions) < num_questions:
            supplement_stmt = select(PracticeQuestion).where(
                PracticeQuestion.topic_id == topic.id,
                PracticeQuestion.difficulty != calibrated_diff,
            ).order_by(PracticeQuestion.order_number.asc())
            supp_res = await db.execute(supplement_stmt)
            for sq in supp_res.scalars().all():
                if len(questions) >= num_questions:
                    break
                if sq not in questions:
                    questions.append(sq)

        questions_dto = [
            PracticeQuestionResponse(
                id=q.id,
                topic_id=topic.id,
                topic_name=topic.name,
                topic_code=topic.code,
                question_text=q.question_text,
                options=q.options,
                difficulty=q.difficulty,
                hint=q.hint,
                order_number=idx + 1,
            )
            for idx, q in enumerate(questions[:num_questions])
        ]

        return PracticeSessionResponse(
            topic_id=topic.id,
            topic_name=topic.name,
            topic_code=topic.code,
            calibrated_difficulty=calibrated_diff,
            mastery_percentage=mastery_pct,
            total_questions=len(questions_dto),
            questions=questions_dto,
        )

    @classmethod
    async def submit_practice_session(
        cls,
        db: AsyncSession,
        learner_profile: LearnerProfile,
        payload: SubmitPracticeSessionRequest,
    ) -> PracticeResultResponse:
        # 1. Fetch Topic
        topic_stmt = select(Topic).where(Topic.id == payload.topic_id)
        topic_res = await db.execute(topic_stmt)
        topic = topic_res.scalar_one_or_none()
        if not topic:
            raise EntityNotFoundException("Topic", payload.topic_id)

        if not payload.answers:
            raise ValidationException("Answers list cannot be empty.")

        # 2. Fetch existing topic mastery before submission
        perf_stmt = select(TopicPerformance).where(
            TopicPerformance.learner_profile_id == learner_profile.id,
            TopicPerformance.topic_id == topic.id,
        )
        perf_res = await db.execute(perf_stmt)
        perf_record = perf_res.scalar_one_or_none()
        previous_mastery = round(perf_record.mastery_score * 100.0, 1) if perf_record else 50.0

        # 3. Grade the submitted answers
        reviews: List[QuestionReviewItem] = []
        correct_count = 0
        answers_payload = []
        dominant_difficulty = ContentDifficulty.BEGINNER

        for sub in payload.answers:
            q_stmt = select(PracticeQuestion).where(PracticeQuestion.id == sub.question_id)
            q_res = await db.execute(q_stmt)
            question = q_res.scalar_one_or_none()
            if not question:
                continue

            dominant_difficulty = question.difficulty
            is_correct = (sub.selected_answer.strip().upper() == question.correct_answer.strip().upper())
            if is_correct:
                correct_count += 1

            reviews.append(
                QuestionReviewItem(
                    question_id=question.id,
                    question_text=question.question_text,
                    selected_answer=sub.selected_answer,
                    correct_answer=question.correct_answer,
                    is_correct=is_correct,
                    explanation=question.explanation,
                )
            )

            answers_payload.append(
                {
                    "question_id": str(question.id),
                    "selected": sub.selected_answer,
                    "correct": question.correct_answer,
                    "is_correct": is_correct,
                }
            )

        total_questions = len(reviews)
        score = float(correct_count)
        percentage = round((correct_count / total_questions) * 100.0, 1) if total_questions > 0 else 0.0

        # 4. Store PracticeAttempt
        now = datetime.now(timezone.utc)
        attempt = PracticeAttempt(
            learner_profile_id=learner_profile.id,
            topic_id=topic.id,
            content_id=payload.content_id,
            score=score,
            percentage=percentage,
            difficulty=dominant_difficulty,
            answers_payload=answers_payload,
            completed_at=now,
        )
        db.add(attempt)
        await db.flush()

        # 5. Recalculate TopicPerformance & updated mastery
        overview = await PerformanceAnalyzer.analyze_learner_performance(db, learner_profile)
        topic_metric = next((m for m in overview.all_topics if m.topic_id == topic.id), None)
        updated_mastery = topic_metric.mastery_percentage if topic_metric else percentage
        mastery_status = topic_metric.mastery_status if topic_metric else PerformanceAnalyzer.determine_mastery_status(updated_mastery)
        difficulty_adjusted_to = topic_metric.current_difficulty if topic_metric else PerformanceAnalyzer.determine_topic_difficulty(updated_mastery)

        # 6. Recalculate Recommendations
        recs = await RecommendationEngine.generate_recommendations(db, learner_profile, limit=3)
        next_rec = recs.recommendations[0] if recs.recommendations else None
        next_content_id = next_rec.content_id if next_rec else None

        # 7. Update active Learning Path item if applicable
        if payload.content_id:
            path_item_stmt = select(LearningPathItem).join(LearningPath).where(
                LearningPath.learner_profile_id == learner_profile.id,
                LearningPathItem.content_id == payload.content_id,
                LearningPathItem.status != PathItemStatus.COMPLETED,
            )
            path_item_res = await db.execute(path_item_stmt)
            path_item = path_item_res.scalar_one_or_none()
            if path_item:
                path_item.status = PathItemStatus.COMPLETED
                path_item.completed_at = now

        # Explainable next action formulation
        if percentage >= 80.0:
            action_reason = (
                f"Excellent score of {percentage:.0f}%! Your {topic.name} mastery advanced from "
                f"{previous_mastery:.0f}% to {updated_mastery:.0f}% ({mastery_status.value.upper()}). "
                f"Ready for advanced application or next curriculum milestone."
            )
        elif percentage >= 60.0:
            action_reason = (
                f"Solid effort! You scored {percentage:.0f}%, bringing {topic.name} mastery to {updated_mastery:.0f}%. "
                f"Continued practice will advance you to proficient mastery."
            )
        else:
            action_reason = (
                f"You scored {percentage:.0f}% in {topic.name}. "
                f"Recommended foundational lesson review to reinforce core principles."
            )

        await db.commit()

        return PracticeResultResponse(
            attempt_id=attempt.id,
            topic_id=topic.id,
            topic_name=topic.name,
            score=score,
            total_questions=total_questions,
            percentage=percentage,
            difficulty=dominant_difficulty,
            previous_mastery=previous_mastery,
            updated_mastery=updated_mastery,
            mastery_status=mastery_status,
            difficulty_adjusted_to=difficulty_adjusted_to,
            recommended_next_action=action_reason,
            next_content_id=next_content_id,
            reviews=reviews,
            completed_at=now,
        )
