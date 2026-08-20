import uuid
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import EntityNotFoundException
from app.models.curriculum import Subject, Topic, Skill, LearningContent
from app.schemas.curriculum import (
    SubjectResponse,
    SubjectDetailResponse,
    TopicResponse,
    TopicDetailResponse,
    SkillResponse,
)


class CurriculumService:
    @staticmethod
    async def list_subjects(db: AsyncSession) -> List[SubjectResponse]:
        stmt = (
            select(Subject)
            .options(selectinload(Subject.topics))
            .order_by(Subject.order_number)
        )
        res = await db.execute(stmt)
        subjects = res.scalars().all()

        responses = []
        for s in subjects:
            responses.append(
                SubjectResponse(
                    id=s.id,
                    code=s.code,
                    name=s.name,
                    description=s.description,
                    order_number=s.order_number,
                    topics_count=len(s.topics),
                    created_at=s.created_at,
                )
            )
        return responses

    @staticmethod
    async def get_subject_by_id(db: AsyncSession, subject_id: uuid.UUID) -> SubjectDetailResponse:
        stmt = (
            select(Subject)
            .options(
                selectinload(Subject.topics).selectinload(Topic.skills),
                selectinload(Subject.topics).selectinload(Topic.learning_contents),
            )
            .where(Subject.id == subject_id)
        )
        res = await db.execute(stmt)
        subject = res.scalar_one_or_none()
        if not subject:
            raise EntityNotFoundException("Subject", subject_id)

        topic_responses = [
            TopicResponse(
                id=t.id,
                subject_id=t.subject_id,
                prerequisite_topic_id=t.prerequisite_topic_id,
                code=t.code,
                name=t.name,
                description=t.description,
                order_number=t.order_number,
                skills_count=len(t.skills),
                contents_count=len(t.learning_contents),
                created_at=t.created_at,
            )
            for t in subject.topics
        ]

        return SubjectDetailResponse(
            id=subject.id,
            code=subject.code,
            name=subject.name,
            description=subject.description,
            order_number=subject.order_number,
            topics=topic_responses,
            created_at=subject.created_at,
        )

    @staticmethod
    async def list_topics(
        db: AsyncSession, subject_id: Optional[uuid.UUID] = None
    ) -> List[TopicResponse]:
        stmt = select(Topic).options(
            selectinload(Topic.skills),
            selectinload(Topic.learning_contents),
        ).order_by(Topic.order_number)

        if subject_id:
            stmt = stmt.where(Topic.subject_id == subject_id)

        res = await db.execute(stmt)
        topics = res.scalars().all()

        return [
            TopicResponse(
                id=t.id,
                subject_id=t.subject_id,
                prerequisite_topic_id=t.prerequisite_topic_id,
                code=t.code,
                name=t.name,
                description=t.description,
                order_number=t.order_number,
                skills_count=len(t.skills),
                contents_count=len(t.learning_contents),
                created_at=t.created_at,
            )
            for t in topics
        ]

    @staticmethod
    async def get_topic_by_id(db: AsyncSession, topic_id: uuid.UUID) -> TopicDetailResponse:
        stmt = (
            select(Topic)
            .options(
                selectinload(Topic.skills),
                selectinload(Topic.learning_contents),
            )
            .where(Topic.id == topic_id)
        )
        res = await db.execute(stmt)
        topic = res.scalar_one_or_none()
        if not topic:
            raise EntityNotFoundException("Topic", topic_id)

        skill_responses = [
            SkillResponse(
                id=s.id,
                topic_id=s.topic_id,
                name=s.name,
                description=s.description,
                difficulty_level=s.difficulty_level,
                order_number=s.order_number,
                created_at=s.created_at,
            )
            for s in topic.skills
        ]

        return TopicDetailResponse(
            id=topic.id,
            subject_id=topic.subject_id,
            prerequisite_topic_id=topic.prerequisite_topic_id,
            code=topic.code,
            name=topic.name,
            description=topic.description,
            order_number=topic.order_number,
            skills=skill_responses,
            contents_count=len(topic.learning_contents),
            created_at=topic.created_at,
        )
