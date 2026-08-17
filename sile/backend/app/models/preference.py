import uuid
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.profile import LearnerProfile


class LearningPreference(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "learning_preferences"

    learner_profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("learner_profiles.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )
    visual_explanations: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    step_by_step: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    simplified_language: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    audio_support: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    interactive_learning: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    short_sessions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    learner_profile: Mapped["LearnerProfile"] = relationship(
        "LearnerProfile",
        back_populates="learning_preference"
    )
