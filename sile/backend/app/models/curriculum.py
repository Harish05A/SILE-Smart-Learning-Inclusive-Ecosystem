import enum
import uuid
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Union
from sqlalchemy import (
    Enum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.adaptive import (
        TopicPerformance,
        LearningRecommendation,
        LearningPathItem,
        PracticeAttempt,
    )


class ContentDifficulty(str, enum.Enum):
    BEGINNER = "beginner"
    DEVELOPING = "developing"
    PROFICIENT = "proficient"
    ADVANCED = "advanced"


class ContentType(str, enum.Enum):
    EXPLANATION = "explanation"
    EXAMPLE = "example"
    VIDEO = "video"
    PRACTICE = "practice"
    QUIZ = "quiz"


class Subject(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "subjects"

    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    topics: Mapped[List["Topic"]] = relationship(
        "Topic",
        back_populates="subject",
        cascade="all, delete-orphan",
        order_by="Topic.order_number",
    )
    learning_contents: Mapped[List["LearningContent"]] = relationship(
        "LearningContent",
        back_populates="subject",
        cascade="all, delete-orphan",
    )


class Topic(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "topics"

    subject_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prerequisite_topic_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("topics.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    subject: Mapped["Subject"] = relationship("Subject", back_populates="topics")
    prerequisite_topic: Mapped[Optional["Topic"]] = relationship(
        "Topic",
        remote_side="Topic.id",
        foreign_keys=[prerequisite_topic_id],
    )
    skills: Mapped[List["Skill"]] = relationship(
        "Skill",
        back_populates="topic",
        cascade="all, delete-orphan",
        order_by="Skill.order_number",
    )
    learning_contents: Mapped[List["LearningContent"]] = relationship(
        "LearningContent",
        back_populates="topic",
        cascade="all, delete-orphan",
    )
    performances: Mapped[List["TopicPerformance"]] = relationship(
        "TopicPerformance",
        back_populates="topic",
        cascade="all, delete-orphan",
    )
    recommendations: Mapped[List["LearningRecommendation"]] = relationship(
        "LearningRecommendation",
        back_populates="topic",
        cascade="all, delete-orphan",
    )


class Skill(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "skills"

    topic_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    difficulty_level: Mapped[ContentDifficulty] = mapped_column(
        Enum(ContentDifficulty, name="content_difficulty_enum"),
        default=ContentDifficulty.BEGINNER,
        nullable=False,
    )
    order_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    topic: Mapped["Topic"] = relationship("Topic", back_populates="skills")
    learning_contents: Mapped[List["LearningContent"]] = relationship(
        "LearningContent",
        back_populates="skill",
    )


class LearningContent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "learning_contents"

    subject_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    skill_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("skills.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_type: Mapped[ContentType] = mapped_column(
        Enum(ContentType, name="content_type_enum"),
        default=ContentType.EXPLANATION,
        nullable=False,
        index=True,
    )
    content_body: Mapped[str] = mapped_column(Text, nullable=False)
    media_payload: Mapped[Optional[Union[Dict[str, Any], List[Any], Any]]] = mapped_column(
        JSON,
        nullable=True,
    )
    difficulty_level: Mapped[ContentDifficulty] = mapped_column(
        Enum(ContentDifficulty, name="content_difficulty_enum"),
        default=ContentDifficulty.BEGINNER,
        nullable=False,
        index=True,
    )
    estimated_duration_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    prerequisites: Mapped[Optional[Union[List[str], Dict[str, Any], Any]]] = mapped_column(
        JSON,
        nullable=True,
    )

    # Relationships
    subject: Mapped["Subject"] = relationship("Subject", back_populates="learning_contents")
    topic: Mapped["Topic"] = relationship("Topic", back_populates="learning_contents")
    skill: Mapped[Optional["Skill"]] = relationship("Skill", back_populates="learning_contents")
    path_items: Mapped[List["LearningPathItem"]] = relationship(
        "LearningPathItem",
        back_populates="content",
    )
    practice_attempts: Mapped[List["PracticeAttempt"]] = relationship(
        "PracticeAttempt",
        back_populates="content",
    )
