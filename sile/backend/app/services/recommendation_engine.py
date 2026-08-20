import uuid
from datetime import datetime, timezone
from typing import List, Optional, Set
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.profile import LearnerProfile
from app.models.preference import LearningPreference
from app.models.curriculum import Topic, LearningContent, ContentDifficulty, ContentType
from app.models.adaptive import (
    LearningRecommendation,
    RecommendationPriority,
    RecommendationStatus,
    PracticeAttempt,
    LearningPathItem,
    PathItemStatus,
)
from app.schemas.recommendation import (
    RecommendationItemResponse,
    LearnerRecommendationsResponse,
)
from app.services.performance_analyzer import PerformanceAnalyzer


class RecommendationEngine:
    """
    Deterministic, explainable Rule-Based Recommendation Engine for Phase 2.
    Decoupled and modular so Phase 3 Multi-Agent controllers can later enhance or replace it.
    """

    @classmethod
    async def generate_recommendations(
        cls,
        db: AsyncSession,
        learner_profile: LearnerProfile,
        limit: int = 5,
    ) -> LearnerRecommendationsResponse:
        # 1. Analyze performance metrics for all topics
        overview = await PerformanceAnalyzer.analyze_learner_performance(db, learner_profile)
        topic_metric_map = {m.topic_code: m for m in overview.all_topics}

        # 2. Fetch all topics with learning contents and prerequisites
        topics_stmt = (
            select(Topic)
            .options(
                selectinload(Topic.prerequisite_topic),
                selectinload(Topic.learning_contents),
            )
            .order_by(Topic.order_number.asc())
        )
        topics_res = await db.execute(topics_stmt)
        topics = list(topics_res.scalars().all())

        # 3. Retrieve completed content IDs to avoid redundant recommendations (Rule 6)
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

        path_items_stmt = select(LearningPathItem.content_id).where(
            LearningPathItem.status == PathItemStatus.COMPLETED
        )
        path_items_res = await db.execute(path_items_stmt)
        for c_id in path_items_res.scalars().all():
            if c_id:
                completed_content_ids.add(c_id)

        # 4. Learning Preferences (Rules 7 & 8)
        pref: Optional[LearningPreference] = learner_profile.learning_preference
        prefers_short = pref.short_sessions if pref else False
        prefers_visual = pref.visual_explanations if pref else True

        candidate_recommendations = []
        now = datetime.now(timezone.utc)

        # 5. Evaluate each topic according to rules
        for topic in topics:
            metric = topic_metric_map.get(topic.code)
            if not metric:
                continue

            mastery_pct = metric.mastery_percentage
            last_attempted = metric.last_attempted_at

            # RULE 5: Check prerequisite readiness
            prereq_blocking = False
            prereq_name = ""
            if topic.prerequisite_topic:
                prereq_metric = topic_metric_map.get(topic.prerequisite_topic.code)
                if prereq_metric and prereq_metric.mastery_percentage < 60.0:
                    prereq_blocking = True
                    prereq_name = topic.prerequisite_topic.name

            # Determine Target Difficulty, Priority, and Base Pedagogical Reason
            if prereq_blocking:
                target_diff = ContentDifficulty.BEGINNER
                priority = RecommendationPriority.MEDIUM
                reason = (
                    f"Recommended foundational reinforcement in '{topic.name}' once prerequisite "
                    f"'{prereq_name}' reaches 60% mastery."
                )
            elif mastery_pct < 40.0:
                # RULE 1: Weak topic (< 40%) -> Beginner explanation
                target_diff = ContentDifficulty.BEGINNER
                priority = RecommendationPriority.URGENT if metric.total_attempts > 0 else RecommendationPriority.HIGH
                reason = (
                    f"Accuracy in {topic.name} is {metric.accuracy:.0f}% (mastery: {mastery_pct:.0f}%). "
                    f"Step-by-step beginner explanations will build solid conceptual foundations."
                )
            elif mastery_pct < 70.0:
                # RULE 2: Developing topic (40% - 69%) -> Developing explanations & examples
                target_diff = ContentDifficulty.DEVELOPING
                priority = RecommendationPriority.HIGH
                reason = (
                    f"Accuracy in {topic.name} is {metric.accuracy:.0f}%. "
                    f"Structured examples and guided practice will advance your developing skills toward proficiency."
                )
            elif mastery_pct < 85.0:
                # RULE 3: Good mastery (70% - 84%) -> Proficient practice
                target_diff = ContentDifficulty.PROFICIENT
                priority = RecommendationPriority.MEDIUM
                reason = (
                    f"Solid understanding in {topic.name} ({metric.accuracy:.0f}% accuracy). "
                    f"Proficient level exercises will solidify high mastery."
                )
            else:
                # RULE 4: High mastery (85%+) -> Advanced extension
                target_diff = ContentDifficulty.ADVANCED
                priority = RecommendationPriority.LOW
                reason = (
                    f"High mastery achieved in {topic.name} ({metric.accuracy:.0f}% accuracy). "
                    f"Advanced multi-step challenges and synthesis problems recommended."
                )

            # Select best matching content item from repository
            contents = topic.learning_contents
            # Filter by matching difficulty
            matching_contents = [c for c in contents if c.difficulty_level == target_diff]
            if not matching_contents:
                matching_contents = contents

            # RULE 6: Filter uncompleted
            uncompleted = [c for c in matching_contents if c.id not in completed_content_ids]
            pool = uncompleted if uncompleted else matching_contents

            if pool:
                # RULE 8: Sort by duration if short sessions preferred
                if prefers_short:
                    pool.sort(key=lambda x: x.estimated_duration_minutes)
                # RULE 7: Prefer visual media payload if preferred
                if prefers_visual:
                    pool.sort(key=lambda x: 0 if x.media_payload else 1)

                selected_content: LearningContent = pool[0]
            else:
                selected_content = None

            # Sort key weight for prioritization (Rule 9: Weak > Developing > Strong; Rule 10: Oldest activity first)
            # Priority order: URGENT(4), HIGH(3), MEDIUM(2), LOW(1)
            priority_weight = {
                RecommendationPriority.URGENT: 4,
                RecommendationPriority.HIGH: 3,
                RecommendationPriority.MEDIUM: 2,
                RecommendationPriority.LOW: 1,
            }[priority]

            # Invert timestamp for oldest-first ordering
            timestamp_sec = last_attempted.timestamp() if last_attempted else 0.0

            candidate_recommendations.append(
                {
                    "topic": topic,
                    "content": selected_content,
                    "target_diff": target_diff,
                    "priority": priority,
                    "priority_weight": priority_weight,
                    "mastery_pct": mastery_pct,
                    "timestamp_sec": timestamp_sec,
                    "reason": reason,
                }
            )

        # RULE 9 & 10: Sort by priority weight DESC, then mastery_pct ASC (weakest first), then timestamp_sec ASC (oldest first)
        candidate_recommendations.sort(
            key=lambda x: (-x["priority_weight"], x["mastery_pct"], x["timestamp_sec"])
        )

        # 6. Synchronize recommendations in database & format DTOs
        selected_candidates = candidate_recommendations[:limit]
        dto_items: List[RecommendationItemResponse] = []

        for item in selected_candidates:
            topic = item["topic"]
            content = item["content"]
            priority = item["priority"]
            reason = item["reason"]
            target_diff = item["target_diff"]

            # Upsert into learning_recommendations
            rec_stmt = select(LearningRecommendation).where(
                LearningRecommendation.learner_profile_id == learner_profile.id,
                LearningRecommendation.topic_id == topic.id,
                LearningRecommendation.status == RecommendationStatus.PENDING,
            )
            rec_res = await db.execute(rec_stmt)
            rec_record = rec_res.scalar_one_or_none()

            if not rec_record:
                rec_record = LearningRecommendation(
                    learner_profile_id=learner_profile.id,
                    topic_id=topic.id,
                    content_id=content.id if content else None,
                    reason=reason,
                    priority=priority,
                    status=RecommendationStatus.PENDING,
                )
                db.add(rec_record)
                await db.flush()
            else:
                rec_record.content_id = content.id if content else None
                rec_record.reason = reason
                rec_record.priority = priority
                await db.flush()

            dto_items.append(
                RecommendationItemResponse(
                    id=rec_record.id,
                    topic_id=topic.id,
                    topic_name=topic.name,
                    topic_code=topic.code,
                    content_id=content.id if content else None,
                    content_title=content.title if content else None,
                    content_type=content.content_type if content else None,
                    difficulty=target_diff,
                    estimated_duration_minutes=content.estimated_duration_minutes if content else 5,
                    priority=priority,
                    status=rec_record.status,
                    reason=reason,
                    created_at=rec_record.created_at,
                )
            )

        await db.commit()

        return LearnerRecommendationsResponse(
            learner_id=learner_profile.id,
            total_recommendations=len(dto_items),
            recommendations=dto_items,
            generated_at=now,
        )
