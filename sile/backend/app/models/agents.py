import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import (
    CheckConstraint,
    DateTime,
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
    from app.models.profile import LearnerProfile
    from app.models.curriculum import Topic, LearningContent


class SessionType(str, enum.Enum):
    LESSON_ADAPTATION = "lesson_adaptation"
    INTERACTIVE_TUTORING = "interactive_tutoring"
    FORMATIVE_ASSESSMENT = "formative_assessment"


class SessionStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentName(str, enum.Enum):
    COORDINATOR = "coordinator"
    LEARNER_ANALYSIS = "learner_analysis"
    CONTENT_ADAPTATION = "content_adaptation"
    ASSESSMENT = "assessment"
    ACCESSIBILITY = "accessibility"


class InteractionStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentSession(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Represents an end-to-end multi-agent pedagogical session for a learner.
    Tracks session lifecycle, subject/content context, and user inquiry.
    """
    __tablename__ = "agent_sessions"

    learner_profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("learner_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_type: Mapped[SessionType] = mapped_column(
        Enum(SessionType, name="agent_session_type_enum", create_constraint=False),
        nullable=False,
    )
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, name="agent_session_status_enum", create_constraint=False),
        default=SessionStatus.PENDING,
        nullable=False,
    )
    user_inquiry: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    topic_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("topics.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    content_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("learning_contents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    learner_profile: Mapped["LearnerProfile"] = relationship(
        "LearnerProfile",
        back_populates="agent_sessions",
    )
    topic: Mapped[Optional["Topic"]] = relationship("Topic")
    content: Mapped[Optional["LearningContent"]] = relationship("LearningContent")

    interactions: Mapped[List["AgentInteraction"]] = relationship(
        "AgentInteraction",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="AgentInteraction.created_at",
    )
    comparison_evaluation: Mapped[Optional["AgentComparisonEvaluation"]] = relationship(
        "AgentComparisonEvaluation",
        back_populates="session",
        uselist=False,
        cascade="all, delete-orphan",
    )


class AgentInteraction(Base, UUIDPrimaryKeyMixin):
    """
    Audit log for each individual agent step within a session.
    Records inputs, outputs, execution latency, and error states.
    """
    __tablename__ = "agent_interactions"

    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("agent_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    agent_name: Mapped[AgentName] = mapped_column(
        Enum(AgentName, name="agent_name_enum", create_constraint=False),
        nullable=False,
    )
    input_payload: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
    output_payload: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
    status: Mapped[InteractionStatus] = mapped_column(
        Enum(InteractionStatus, name="agent_interaction_status_enum", create_constraint=False),
        default=InteractionStatus.PENDING,
        nullable=False,
    )
    latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    session: Mapped["AgentSession"] = relationship(
        "AgentSession",
        back_populates="interactions",
    )


class AgentComparisonEvaluation(Base, UUIDPrimaryKeyMixin):
    """
    Comparative evaluation between Phase 2 deterministic rule-based output
    and Phase 3 multi-agent intelligence output.
    """
    __tablename__ = "agent_comparison_evaluations"
    __table_args__ = (
        CheckConstraint(
            "learner_rating >= 1 AND learner_rating <= 5",
            name="check_learner_rating_range",
        ),
    )

    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("agent_sessions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    rule_based_output: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
    multi_agent_output: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
    learner_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    session: Mapped["AgentSession"] = relationship(
        "AgentSession",
        back_populates="comparison_evaluation",
    )
