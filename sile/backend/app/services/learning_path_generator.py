import uuid
from datetime import datetime, timezone
from typing import List, Optional, Set
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import EntityNotFoundException, ValidationException
from app.models.profile import LearnerProfile
from app.models.preference import LearningPreference
from app.models.curriculum import Subject, Topic, LearningContent, ContentDifficulty
from app.models.adaptive import (
    LearningPath,
    LearningPathItem,
    LearningPathStatus,
    PathItemStatus,
    PracticeAttempt,
)
from app.schemas.learning_path import (
    LearningPathResponse,
    LearningPathItemResponse,
)
from app.services.performance_analyzer import PerformanceAnalyzer


class LearningPathGenerator:
    """
    Deterministic, explainable Rule-Based Learning Path Generator for Phase 2.
    Builds personalized, topologically sorted 5-10 item learning pathways.
    """

    @classmethod
    async def generate_path(
        cls,
        db: AsyncSession,
        learner_profile: LearnerProfile,
        subject_id: Optional[uuid.UUID] = None,
        max_items: int = 8,
    ) -> LearningPathResponse:
        # 1. Fetch Performance Metrics
        overview = await PerformanceAnalyzer.analyze_learner_performance(db, learner_profile)
        topic_metric_map = {m.topic_code: m for m in overview.all_topics}

        # 2. Fetch Subject & Ordered Topics
        subject_stmt = select(Subject).options(
            selectinload(Subject.topics).selectinload(Topic.learning_contents),
            selectinload(Subject.topics).selectinload(Topic.prerequisite_topic),
        ).order_by(Subject.order_number.asc())

        if subject_id:
            subject_stmt = subject_stmt.where(Subject.id == subject_id)

        subject_res = await db.execute(subject_stmt)
        subject = subject_res.scalars().first()
        if not subject:
            raise EntityNotFoundException("Subject", subject_id or "default")

        # 3. Retrieve previously completed content IDs
        completed_content_ids: Set[uuid.UUID] = set()

        practice_stmt = select(PracticeAttempt.content_id).where(
            PracticeAttempt.learner_profile_id == learner_profile.id,
            PracticeAttempt.percentage >= 70.0,
            PracticeAttempt.content_id.isnot(None),
        )
        practice_res = await db.execute(practice_stmt)
        for c_id in practice_res.scalars().all():
            if c_id:
                completed_content_ids.add(c_id)

        existing_path_items_stmt = select(LearningPathItem.content_id).join(LearningPath).where(
            LearningPath.learner_profile_id == learner_profile.id,
            LearningPathItem.status == PathItemStatus.COMPLETED,
        )
        existing_res = await db.execute(existing_path_items_stmt)
        for c_id in existing_res.scalars().all():
            if c_id:
                completed_content_ids.add(c_id)

        # 4. Learning Preferences
        pref: Optional[LearningPreference] = learner_profile.learning_preference
        prefers_short = pref.short_sessions if pref else False
        prefers_visual = pref.visual_explanations if pref else True

        # 5. Topologically sort topics (prerequisites first)
        topics = list(subject.topics)
        topics.sort(key=lambda t: t.order_number)

        # 6. Allocate content items according to mastery gaps
        allocated_contents: List[LearningContent] = []

        for topic in topics:
            if len(allocated_contents) >= max_items:
                break

            metric = topic_metric_map.get(topic.code)
            mastery_pct = metric.mastery_percentage if metric else 50.0

            # Determine item count and difficulty targets per topic
            if mastery_pct < 40.0:
                # Weak topic: Allocate 2 items (Beginner -> Developing)
                targets = [ContentDifficulty.BEGINNER, ContentDifficulty.DEVELOPING]
            elif mastery_pct < 70.0:
                # Developing topic: Allocate 1-2 items (Developing -> Proficient)
                targets = [ContentDifficulty.DEVELOPING, ContentDifficulty.PROFICIENT]
            elif mastery_pct < 85.0:
                # Good topic: Allocate 1 item (Proficient)
                targets = [ContentDifficulty.PROFICIENT]
            else:
                # High mastery: Allocate 1 item (Advanced)
                targets = [ContentDifficulty.ADVANCED]

            for diff in targets:
                if len(allocated_contents) >= max_items:
                    break

                contents_matching = [
                    c for c in topic.learning_contents if c.difficulty_level == diff
                ]
                if not contents_matching:
                    contents_matching = topic.learning_contents

                # Prefer uncompleted content
                uncompleted = [
                    c for c in contents_matching
                    if c.id not in completed_content_ids and c not in allocated_contents
                ]
                pool = uncompleted if uncompleted else [
                    c for c in contents_matching if c not in allocated_contents
                ]

                if pool:
                    # Preference sorting
                    if prefers_short:
                        pool.sort(key=lambda x: x.estimated_duration_minutes)
                    if prefers_visual:
                        pool.sort(key=lambda x: 0 if x.media_payload else 1)

                    chosen = pool[0]
                    allocated_contents.append(chosen)

        # If less than 5 items, fill in remaining available contents in sequence
        if len(allocated_contents) < 5:
            for topic in topics:
                for c in topic.learning_contents:
                    if len(allocated_contents) >= 5:
                        break
                    if c not in allocated_contents:
                        allocated_contents.append(c)

        # 7. Create LearningPath record
        title = f"Personalized {subject.name} Mastery Path"
        description = (
            f"Custom {len(allocated_contents)}-step adaptive path calibrated to strengthen "
            f"foundational gaps and advance concept mastery."
        )

        learning_path = LearningPath(
            learner_profile_id=learner_profile.id,
            subject_id=subject.id,
            title=title,
            description=description,
            status=LearningPathStatus.IN_PROGRESS,
        )
        db.add(learning_path)
        await db.flush()

        # 8. Create LearningPathItem records
        path_items_db = []
        for idx, content in enumerate(allocated_contents, start=1):
            item_status = PathItemStatus.IN_PROGRESS if idx == 1 else PathItemStatus.PENDING
            item = LearningPathItem(
                learning_path_id=learning_path.id,
                content_id=content.id,
                sequence_number=idx,
                status=item_status,
            )
            db.add(item)
            path_items_db.append(item)

        await db.commit()

        # 9. Format response
        return await cls.get_path_by_id(db, learning_path.id, learner_profile)

    @classmethod
    async def list_paths(
        cls,
        db: AsyncSession,
        learner_profile: LearnerProfile,
    ) -> List[LearningPathResponse]:
        stmt = (
            select(LearningPath)
            .options(
                selectinload(LearningPath.subject),
                selectinload(LearningPath.items)
                .selectinload(LearningPathItem.content)
                .selectinload(LearningContent.topic),
            )
            .where(LearningPath.learner_profile_id == learner_profile.id)
            .order_by(LearningPath.created_at.desc())
        )
        res = await db.execute(stmt)
        paths = res.scalars().all()

        return [cls._build_response(p) for p in paths]

    @classmethod
    async def get_path_by_id(
        cls,
        db: AsyncSession,
        path_id: uuid.UUID,
        learner_profile: LearnerProfile,
    ) -> LearningPathResponse:
        stmt = (
            select(LearningPath)
            .options(
                selectinload(LearningPath.subject),
                selectinload(LearningPath.items)
                .selectinload(LearningPathItem.content)
                .selectinload(LearningContent.topic),
            )
            .where(
                LearningPath.id == path_id,
                LearningPath.learner_profile_id == learner_profile.id,
            )
        )
        res = await db.execute(stmt)
        path = res.scalar_one_or_none()
        if not path:
            raise EntityNotFoundException("LearningPath", path_id)

        return cls._build_response(path)

    @classmethod
    async def update_item_status(
        cls,
        db: AsyncSession,
        path_id: uuid.UUID,
        item_id: uuid.UUID,
        new_status: PathItemStatus,
        learner_profile: LearnerProfile,
    ) -> LearningPathResponse:
        stmt = (
            select(LearningPath)
            .options(
                selectinload(LearningPath.subject),
                selectinload(LearningPath.items)
                .selectinload(LearningPathItem.content)
                .selectinload(LearningContent.topic),
            )
            .where(
                LearningPath.id == path_id,
                LearningPath.learner_profile_id == learner_profile.id,
            )
        )
        res = await db.execute(stmt)
        path = res.scalar_one_or_none()
        if not path:
            raise EntityNotFoundException("LearningPath", path_id)

        target_item = next((item for item in path.items if item.id == item_id), None)
        if not target_item:
            raise EntityNotFoundException("LearningPathItem", item_id)

        target_item.status = new_status
        if new_status == PathItemStatus.COMPLETED:
            target_item.completed_at = datetime.now(timezone.utc)
            # Advance next pending item to in_progress if applicable
            next_item = next(
                (item for item in path.items if item.sequence_number == target_item.sequence_number + 1),
                None,
            )
            if next_item and next_item.status == PathItemStatus.PENDING:
                next_item.status = PathItemStatus.IN_PROGRESS

        # Recalculate overall path status
        all_completed_or_skipped = all(
            item.status in [PathItemStatus.COMPLETED, PathItemStatus.SKIPPED] for item in path.items
        )
        if all_completed_or_skipped:
            path.status = LearningPathStatus.COMPLETED
        else:
            path.status = LearningPathStatus.IN_PROGRESS

        path.updated_at = datetime.now(timezone.utc)
        await db.commit()

        return cls._build_response(path)

    @classmethod
    def _build_response(cls, path: LearningPath) -> LearningPathResponse:
        items_dto: List[LearningPathItemResponse] = []
        total_duration = 0
        completed_count = 0

        # Sort items by sequence number
        sorted_items = sorted(path.items, key=lambda x: x.sequence_number)

        for item in sorted_items:
            content = item.content
            topic = content.topic if content else None
            duration = content.estimated_duration_minutes if content else 5
            total_duration += duration

            if item.status == PathItemStatus.COMPLETED:
                completed_count += 1

            items_dto.append(
                LearningPathItemResponse(
                    id=item.id,
                    learning_path_id=item.learning_path_id,
                    content_id=item.content_id,
                    content_title=content.title if content else "Lesson",
                    topic_id=topic.id if topic else uuid.uuid4(),
                    topic_name=topic.name if topic else "General",
                    topic_code=topic.code if topic else "GEN",
                    difficulty=content.difficulty_level if content else ContentDifficulty.BEGINNER,
                    content_type=content.content_type if content else "explanation",
                    estimated_duration_minutes=duration,
                    sequence_number=item.sequence_number,
                    status=item.status,
                    completed_at=item.completed_at,
                )
            )

        total_items = len(items_dto)
        progress_pct = round((completed_count / total_items) * 100.0, 1) if total_items > 0 else 0.0

        return LearningPathResponse(
            id=path.id,
            learner_profile_id=path.learner_profile_id,
            subject_id=path.subject_id,
            subject_name=path.subject.name if path.subject else "Mathematics",
            title=path.title,
            description=path.description,
            status=path.status,
            total_items=total_items,
            completed_items=completed_count,
            progress_percentage=progress_pct,
            total_estimated_duration_minutes=total_duration,
            items=items_dto,
            created_at=path.created_at,
            updated_at=path.updated_at,
        )
