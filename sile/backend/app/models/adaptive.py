import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Union
from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.curriculum import ContentDifficulty

if TYPE_CHECKING:
    from app.models.profile import LearnerProfile
    from app.models.curriculum import Subject, Topic, LearningContent


class RecommendationPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class RecommendationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    COMPLETED = "completed"
    DISMISSED = "dismissed"


class LearningPathStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class PathItemStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class TopicPerformance(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "topic_performances"

    learner_profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("learner_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    correct_answers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    accuracy: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    current_difficulty: Mapped[ContentDifficulty] = mapped_column(
        Enum(ContentDifficulty, name="content_difficulty_enum", create_constraint=False),
        default=ContentDifficulty.BEGINNER,
        nullable=False,
    )
    mastery_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # 0.0 to 1.0
    last_attempted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    learner_profile: Mapped["LearnerProfile"] = relationship(
        "LearnerProfile",
        back_populates="topic_performances",
    )
    topic: Mapped["Topic"] = relationship(
        "Topic",
        back_populates="performances",
    )


class LearningRecommendation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "learning_recommendations"

    learner_profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("learner_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("learning_contents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[RecommendationPriority] = mapped_column(
        Enum(RecommendationPriority, name="recommendation_priority_enum"),
        default=RecommendationPriority.MEDIUM,
        nullable=False,
        index=True,
    )
    status: Mapped[RecommendationStatus] = mapped_column(
        Enum(RecommendationStatus, name="recommendation_status_enum"),
        default=RecommendationStatus.PENDING,
        nullable=False,
        index=True,
    )

    # Relationships
    learner_profile: Mapped["LearnerProfile"] = relationship(
        "LearnerProfile",
        back_populates="recommendations",
    )
    topic: Mapped["Topic"] = relationship(
        "Topic",
        back_populates="recommendations",
    )
    content: Mapped[Optional["LearningContent"]] = relationship(
        "LearningContent",
    )


class LearningPath(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "learning_paths"

    learner_profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("learner_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("subjects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[LearningPathStatus] = mapped_column(
        Enum(LearningPathStatus, name="learning_path_status_enum"),
        default=LearningPathStatus.NOT_STARTED,
        nullable=False,
        index=True,
    )

    # Relationships
    learner_profile: Mapped["LearnerProfile"] = relationship(
        "LearnerProfile",
        back_populates="learning_paths",
    )
    subject: Mapped[Optional["Subject"]] = relationship("Subject")
    items: Mapped[List["LearningPathItem"]] = relationship(
        "LearningPathItem",
        back_populates="learning_path",
        cascade="all, delete-orphan",
        order_by="LearningPathItem.sequence_number",
    )


class LearningPathItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "learning_path_items"

    learning_path_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("learning_paths.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("learning_contents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sequence_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[PathItemStatus] = mapped_column(
        Enum(PathItemStatus, name="path_item_status_enum"),
        default=PathItemStatus.PENDING,
        nullable=False,
        index=True,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    learning_path: Mapped["LearningPath"] = relationship(
        "LearningPath",
        back_populates="items",
    )
    content: Mapped["LearningContent"] = relationship(
        "LearningContent",
        back_populates="path_items",
    )


class PracticeAttempt(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "practice_attempts"

    learner_profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("learner_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("learning_contents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    difficulty: Mapped[ContentDifficulty] = mapped_column(
        Enum(ContentDifficulty, name="content_difficulty_enum", create_constraint=False),
        nullable=False,
        index=True,
    )
    answers_payload: Mapped[Optional[Union[Dict[str, Any], List[Any], Any]]] = mapped_column(
        JSON,
        nullable=True,
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    learner_profile: Mapped["LearnerProfile"] = relationship(
        "LearnerProfile",
        back_populates="practice_attempts",
    )
    topic: Mapped["Topic"] = relationship("Topic")
    content: Mapped[Optional["LearningContent"]] = relationship(
        "LearningContent",
        back_populates="practice_attempts",
    )
