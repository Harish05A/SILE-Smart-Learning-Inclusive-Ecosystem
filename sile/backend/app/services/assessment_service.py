import uuid
from datetime import datetime, timezone
from typing import List, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.assessment import (
    Assessment,
    AssessmentQuestion,
    AssessmentAttempt,
    AssessmentAnswer,
    LearningLevel,
)
from app.schemas.assessment import (
    AssessmentAttemptSubmission,
    AssessmentAttemptResultResponse,
    AssessmentAnswerDetailResponse,
)
from app.core.exceptions import EntityNotFoundException


class AssessmentService:
    @staticmethod
    async def list_assessments(db: AsyncSession) -> List[Assessment]:
        stmt = select(Assessment).order_by(Assessment.created_at.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_assessment_by_id(db: AsyncSession, assessment_id: uuid.UUID) -> Assessment:
        stmt = (
            select(Assessment)
            .options(selectinload(Assessment.questions))
            .where(Assessment.id == assessment_id)
        )
        result = await db.execute(stmt)
        assessment = result.scalar_one_or_none()
        if not assessment:
            raise EntityNotFoundException("Assessment", assessment_id)
        return assessment

    @staticmethod
    def calculate_learning_level(percentage: float) -> LearningLevel:
        """
        Learning level classification:
        0–39%: Beginner
        40–69%: Developing
        70–100%: Proficient
        """
        if percentage < 40.0:
            return LearningLevel.BEGINNER
        elif percentage < 70.0:
            return LearningLevel.DEVELOPING
        else:
            return LearningLevel.PROFICIENT

    @classmethod
    async def submit_attempt(
        cls,
        db: AsyncSession,
        assessment_id: uuid.UUID,
        learner_profile_id: uuid.UUID,
        payload: AssessmentAttemptSubmission,
    ) -> AssessmentAttemptResultResponse:
        assessment = await cls.get_assessment_by_id(db, assessment_id)
        questions_map = {q.id: q for q in assessment.questions}

        # Build submitted answers map
        submission_map = {item.question_id: item.selected_answer.strip().upper() for item in payload.answers}

        correct_count = 0
        answers_to_create = []
        answers_summary: List[AssessmentAnswerDetailResponse] = []

        for q in assessment.questions:
            selected = submission_map.get(q.id, "")
            is_correct = (selected == q.correct_answer.strip().upper())

            if is_correct:
                correct_count += 1

            answers_summary.append(
                AssessmentAnswerDetailResponse(
                    question_id=q.id,
                    question_text=q.question_text,
                    selected_answer=selected if selected else "Unanswered",
                    correct_answer=q.correct_answer,
                    is_correct=is_correct,
                )
            )

        total_questions = len(assessment.questions) if assessment.questions else 1
        score = float(correct_count)
        percentage = round((score / total_questions) * 100.0, 1)
        learning_level = cls.calculate_learning_level(percentage)
        now = datetime.now(timezone.utc)

        # 6. Store the attempt
        attempt = AssessmentAttempt(
            learner_profile_id=learner_profile_id,
            assessment_id=assessment.id,
            score=score,
            percentage=percentage,
            learning_level=learning_level,
            started_at=now,
            completed_at=now,
        )
        db.add(attempt)
        await db.flush()

        # 7. Store individual answers
        for q in assessment.questions:
            selected = submission_map.get(q.id, "")
            is_correct = (selected == q.correct_answer.strip().upper())
            db_answer = AssessmentAnswer(
                attempt_id=attempt.id,
                question_id=q.id,
                selected_answer=selected,
                is_correct=is_correct,
            )
            db.add(db_answer)

        await db.commit()

        # 8. Return result
        return AssessmentAttemptResultResponse(
            attempt_id=attempt.id,
            assessment_id=assessment.id,
            assessment_title=assessment.title,
            score=score,
            total_questions=total_questions,
            percentage=percentage,
            learning_level=learning_level,
            correct_count=correct_count,
            incorrect_count=total_questions - correct_count,
            completed_at=now,
            answers_summary=answers_summary,
        )
