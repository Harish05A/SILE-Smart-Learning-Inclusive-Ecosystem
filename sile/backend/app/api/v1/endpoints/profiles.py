from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.api.dependencies import get_current_user
from app.schemas.profile import (
    LearnerProfileDetailsResponse,
    LearnerProfileUpdate,
)
from app.services.profile_service import ProfileService

router = APIRouter()


@router.get("/profile", response_model=LearnerProfileDetailsResponse, summary="Get Current Learner Profile")
async def get_learner_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the current authenticated user's learner profile and preferences."""
    profile = await ProfileService.get_or_create_profile(db, current_user.id)
    return profile


@router.put("/profile", response_model=LearnerProfileDetailsResponse, summary="Update Learner Profile")
async def update_learner_profile(
    payload: LearnerProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update profile attributes, learning preferences, and accessibility preferences."""
    updated_profile = await ProfileService.update_profile(db, current_user.id, payload)
    return updated_profile
