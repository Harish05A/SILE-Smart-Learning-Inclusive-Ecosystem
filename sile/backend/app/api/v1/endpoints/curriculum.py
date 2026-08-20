import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.schemas.curriculum import (
    SubjectResponse,
    SubjectDetailResponse,
    TopicResponse,
    TopicDetailResponse,
)
from app.services.curriculum_service import CurriculumService

router = APIRouter()


@router.get("/subjects", response_model=List[SubjectResponse], summary="List all subjects")
async def list_subjects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all available subjects ordered by curriculum sequence."""
    return await CurriculumService.list_subjects(db)


@router.get("/subjects/{subject_id}", response_model=SubjectDetailResponse, summary="Get subject details")
async def get_subject_by_id(
    subject_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve subject details with ordered topic list."""
    return await CurriculumService.get_subject_by_id(db, subject_id)


@router.get("/topics", response_model=List[TopicResponse], summary="List topics")
async def list_topics(
    subject_id: Optional[uuid.UUID] = Query(None, description="Optional subject ID filter"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve topics with optional subject filtering."""
    return await CurriculumService.list_topics(db, subject_id=subject_id)


@router.get("/topics/{topic_id}", response_model=TopicDetailResponse, summary="Get topic details")
async def get_topic_by_id(
    topic_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve topic details with sub-skills and prerequisite links."""
    return await CurriculumService.get_topic_by_id(db, topic_id)
