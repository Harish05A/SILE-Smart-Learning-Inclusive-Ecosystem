import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.api.dependencies import get_current_user
from app.schemas.practice import (
    PracticeSessionResponse,
    GeneratePracticeSessionRequest,
    SubmitPracticeSessionRequest,
    PracticeResultResponse,
)
from app.services.profile_service import ProfileService
from app.services.practice_service import PracticeService

router = APIRouter()


@router.post("/generate", response_model=PracticeSessionResponse, summary="Generate Calibrated Practice Session")
@router.get("/generate", response_model=PracticeSessionResponse, summary="Generate Calibrated Practice Session (GET)")
async def generate_practice_session(
    topic_id: Optional[uuid.UUID] = Query(None, description="Topic ID for GET requests"),
    payload: Optional[GeneratePracticeSessionRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Dynamically select practice questions calibrated to the learner's current topic mastery level:
    - < 40%: beginner questions
    - 40%–69%: developing questions
    - 70%–84%: proficient questions
    - 85%+: advanced questions
    """
    profile = await ProfileService.get_or_create_profile(db, current_user.id)
    target_topic_id = payload.topic_id if payload else topic_id
    if not target_topic_id:
        from app.core.exceptions import ValidationException
        raise ValidationException("topic_id is required to generate a practice session.")

    num_questions = payload.num_questions if payload else 5
    return await PracticeService.generate_practice_session(
        db=db,
        learner_profile=profile,
        topic_id=target_topic_id,
        num_questions=num_questions,
    )


@router.post("/submit", response_model=PracticeResultResponse, status_code=status.HTTP_201_CREATED, summary="Submit Practice Session")
async def submit_practice_session(
    payload: SubmitPracticeSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Grade submitted practice responses, record attempt, synchronously update TopicPerformance,
    recalculate mastery and recommendations, and formulate the recommended next action.
    """
    profile = await ProfileService.get_or_create_profile(db, current_user.id)
    return await PracticeService.submit_practice_session(
        db=db,
        learner_profile=profile,
        payload=payload,
    )
