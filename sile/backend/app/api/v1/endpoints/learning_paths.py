import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.api.dependencies import get_current_user
from app.schemas.learning_path import (
    LearningPathResponse,
    LearningPathItemUpdate,
    GenerateLearningPathRequest,
)
from app.services.profile_service import ProfileService
from app.services.learning_path_generator import LearningPathGenerator

router = APIRouter()


@router.post("/generate", response_model=LearningPathResponse, status_code=status.HTTP_201_CREATED, summary="Generate Personalized Learning Path")
async def generate_learning_path(
    payload: Optional[GenerateLearningPathRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a 5-10 step personalized, logically sequenced learning pathway
    calibrated to address the learner's mastery gaps and preferences.
    """
    profile = await ProfileService.get_or_create_profile(db, current_user.id)
    subject_id = payload.subject_id if payload else None
    max_items = payload.max_items if payload else 8
    return await LearningPathGenerator.generate_path(
        db=db,
        learner_profile=profile,
        subject_id=subject_id,
        max_items=max_items,
    )


@router.get("", response_model=List[LearningPathResponse], summary="List Learner Learning Paths")
async def list_learning_paths(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all learning paths created for the current learner."""
    profile = await ProfileService.get_or_create_profile(db, current_user.id)
    return await LearningPathGenerator.list_paths(db, profile)


@router.get("/{path_id}", response_model=LearningPathResponse, summary="Get Learning Path Details")
async def get_learning_path_by_id(
    path_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve a specific learning path with all sequenced learning modules."""
    profile = await ProfileService.get_or_create_profile(db, current_user.id)
    return await LearningPathGenerator.get_path_by_id(db, path_id, profile)


@router.patch("/{path_id}/items/{item_id}", response_model=LearningPathResponse, summary="Update Learning Path Item Status")
async def update_learning_path_item_status(
    path_id: uuid.UUID,
    item_id: uuid.UUID,
    payload: LearningPathItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update progress status on an individual learning path item and advance pathway state."""
    profile = await ProfileService.get_or_create_profile(db, current_user.id)
    return await LearningPathGenerator.update_item_status(
        db=db,
        path_id=path_id,
        item_id=item_id,
        new_status=payload.status,
        learner_profile=profile,
    )
