import enum
import uuid
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Enum, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.preference import LearningPreference
    from app.models.accessibility import AccessibilityPreference
    from app.models.assessment import AssessmentAttempt


class LearningPace(str, enum.Enum):
    SLOW = "slow"
    MODERATE = "moderate"
    FAST = "fast"


class PreferredContentType(str, enum.Enum):
    TEXT = "text"
    VISUAL = "visual"
    AUDIO = "audio"
    INTERACTIVE = "interactive"
    MIXED = "mixed"


class LearnerProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "learner_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    grade: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(50), default="en", nullable=False)
    learning_pace: Mapped[LearningPace] = mapped_column(
        Enum(LearningPace, name="learning_pace_enum"),
        default=LearningPace.MODERATE,
        nullable=False
    )
    preferred_content_type: Mapped[PreferredContentType] = mapped_column(
        Enum(PreferredContentType, name="preferred_content_type_enum"),
        default=PreferredContentType.MIXED,
        nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="learner_profile")
    learning_preference: Mapped["LearningPreference"] = relationship(
        "LearningPreference",
        back_populates="learner_profile",
        uselist=False,
        cascade="all, delete-orphan"
    )
    accessibility_preference: Mapped["AccessibilityPreference"] = relationship(
        "AccessibilityPreference",
        back_populates="learner_profile",
        uselist=False,
        cascade="all, delete-orphan"
    )
    assessment_attempts: Mapped[List["AssessmentAttempt"]] = relationship(
        "AssessmentAttempt",
        back_populates="learner_profile",
        cascade="all, delete-orphan"
    )
