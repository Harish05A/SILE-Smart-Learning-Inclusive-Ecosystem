import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.api.dependencies import get_current_user
from app.schemas.assessment import (
    AssessmentListItemResponse,
    AssessmentDetailResponse,
    AssessmentAttemptSubmission,
    AssessmentAttemptResultResponse,
)
from app.services.assessment_service import AssessmentService
from app.services.profile_service import ProfileService

router = APIRouter()


@router.get("", response_model=List[AssessmentListItemResponse], summary="List Baseline Assessments")
async def list_assessments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List available baseline diagnostic assessments."""
    assessments = await AssessmentService.list_assessments(db)
    return assessments


@router.get("/{assessment_id}", response_model=AssessmentDetailResponse, summary="Get Assessment Details & Questions")
async def get_assessment(
    assessment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve diagnostic questions for a specific assessment."""
    assessment = await AssessmentService.get_assessment_by_id(db, assessment_id)
    return assessment


@router.post(
    "/{assessment_id}/attempt",
    response_model=AssessmentAttemptResultResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Assessment Attempt",
)
async def submit_assessment_attempt(
    assessment_id: uuid.UUID,
    payload: AssessmentAttemptSubmission,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit learner answers for scoring, percentage calculation, and learning level evaluation.
    """
    # Ensure profile exists
    profile = await ProfileService.get_or_create_profile(db, current_user.id)
    result = await AssessmentService.submit_attempt(
        db=db,
        assessment_id=assessment_id,
        learner_profile_id=profile.id,
        payload=payload,
    )
    return result
