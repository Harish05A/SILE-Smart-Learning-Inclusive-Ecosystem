import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import EntityNotFoundException
from app.models.curriculum import (
    LearningContent,
    Subject,
    Topic,
    Skill,
    ContentDifficulty,
    ContentType,
)
from app.schemas.content import (
    LearningContentSummaryResponse,
    LearningContentDetailResponse,
)


class ContentService:
    @staticmethod
    async def list_content(
        db: AsyncSession,
        subject_id: Optional[uuid.UUID] = None,
        topic_id: Optional[uuid.UUID] = None,
        skill_id: Optional[uuid.UUID] = None,
        difficulty: Optional[ContentDifficulty] = None,
        content_type: Optional[ContentType] = None,
    ) -> List[LearningContentSummaryResponse]:
        stmt = (
            select(LearningContent)
            .options(
                selectinload(LearningContent.subject),
                selectinload(LearningContent.topic),
                selectinload(LearningContent.skill),
            )
            .order_by(LearningContent.created_at.asc())
        )

        if subject_id:
            stmt = stmt.where(LearningContent.subject_id == subject_id)
        if topic_id:
            stmt = stmt.where(LearningContent.topic_id == topic_id)
        if skill_id:
            stmt = stmt.where(LearningContent.skill_id == skill_id)
        if difficulty:
            stmt = stmt.where(LearningContent.difficulty_level == difficulty)
        if content_type:
            stmt = stmt.where(LearningContent.content_type == content_type)

        res = await db.execute(stmt)
        items = res.scalars().all()

        return [
            LearningContentSummaryResponse(
                id=c.id,
                subject_id=c.subject_id,
                subject_name=c.subject.name if c.subject else None,
                topic_id=c.topic_id,
                topic_name=c.topic.name if c.topic else None,
                skill_id=c.skill_id,
                skill_name=c.skill.name if c.skill else None,
                title=c.title,
                description=c.description,
                content_type=c.content_type,
                difficulty_level=c.difficulty_level,
                estimated_duration_minutes=c.estimated_duration_minutes,
                prerequisites=c.prerequisites if c.prerequisites else [],
                created_at=c.created_at,
            )
            for c in items
        ]

    @staticmethod
    async def get_content_by_id(
        db: AsyncSession, content_id: uuid.UUID
    ) -> LearningContentDetailResponse:
        stmt = (
            select(LearningContent)
            .options(
                selectinload(LearningContent.subject),
                selectinload(LearningContent.topic),
                selectinload(LearningContent.skill),
            )
            .where(LearningContent.id == content_id)
        )
        res = await db.execute(stmt)
        content = res.scalar_one_or_none()
        if not content:
            raise EntityNotFoundException("LearningContent", content_id)

        return LearningContentDetailResponse(
            id=content.id,
            subject_id=content.subject_id,
            subject_name=content.subject.name if content.subject else None,
            topic_id=content.topic_id,
            topic_name=content.topic.name if content.topic else None,
            skill_id=content.skill_id,
            skill_name=content.skill.name if content.skill else None,
            title=content.title,
            description=content.description,
            content_type=content.content_type,
            content_body=content.content_body,
            media_payload=content.media_payload,
            difficulty_level=content.difficulty_level,
            estimated_duration_minutes=content.estimated_duration_minutes,
            prerequisites=content.prerequisites if content.prerequisites else [],
            created_at=content.created_at,
            updated_at=content.updated_at,
        )
