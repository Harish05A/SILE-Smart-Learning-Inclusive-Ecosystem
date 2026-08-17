import uuid
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.profile import LearnerProfile


class AccessibilityPreference(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "accessibility_preferences"

    learner_profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("learner_profiles.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )
    large_text: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    high_contrast: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    text_to_speech: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reduced_visual_complexity: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    keyboard_navigation: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    learner_profile: Mapped["LearnerProfile"] = relationship(
        "LearnerProfile",
        back_populates="accessibility_preference"
    )
