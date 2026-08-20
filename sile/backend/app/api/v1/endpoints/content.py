import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.curriculum import ContentDifficulty, ContentType
from app.schemas.content import (
    LearningContentSummaryResponse,
    LearningContentDetailResponse,
)
from app.services.content_service import ContentService

router = APIRouter()


@router.get("", response_model=List[LearningContentSummaryResponse], summary="List learning content items")
async def list_content(
    subject_id: Optional[uuid.UUID] = Query(None, description="Filter by subject ID"),
    topic_id: Optional[uuid.UUID] = Query(None, description="Filter by topic ID"),
    skill_id: Optional[uuid.UUID] = Query(None, description="Filter by skill ID"),
    difficulty: Optional[ContentDifficulty] = Query(None, description="Filter by difficulty level"),
    content_type: Optional[ContentType] = Query(None, description="Filter by content type"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve learning content items with multi-dimensional filtering."""
    return await ContentService.list_content(
        db=db,
        subject_id=subject_id,
        topic_id=topic_id,
        skill_id=skill_id,
        difficulty=difficulty,
        content_type=content_type,
    )


@router.get("/{content_id}", response_model=LearningContentDetailResponse, summary="Get learning content detail")
async def get_content_by_id(
    content_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve complete learning content item including markdown body and media payload."""
    return await ContentService.get_content_by_id(db, content_id)
