import uuid
from datetime import datetime
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
from app.models.curriculum import ContentDifficulty

if TYPE_CHECKING:
    from app.models.curriculum import Subject, Topic, Skill


class PracticeQuestion(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "practice_questions"

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
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[Union[List[Dict[str, Any]], Dict[str, Any], Any]] = mapped_column(
        JSON,
        nullable=False,
    )
    correct_answer: Mapped[str] = mapped_column(String(255), nullable=False)
    difficulty: Mapped[ContentDifficulty] = mapped_column(
        Enum(ContentDifficulty, name="content_difficulty_enum", create_constraint=False),
        nullable=False,
        index=True,
    )
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    hint: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    subject: Mapped["Subject"] = relationship("Subject")
    topic: Mapped["Topic"] = relationship("Topic")
    skill: Mapped[Optional["Skill"]] = relationship("Skill")
