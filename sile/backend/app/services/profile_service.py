import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.profile import LearnerProfile
from app.models.preference import LearningPreference
from app.models.accessibility import AccessibilityPreference
from app.schemas.profile import LearnerProfileUpdate
from app.core.exceptions import ResourceNotFoundException


class ProfileService:
    @staticmethod
    async def get_or_create_profile(db: AsyncSession, user_id: uuid.UUID, default_name: str = "Learner") -> LearnerProfile:
        stmt = (
            select(LearnerProfile)
            .options(
                selectinload(LearnerProfile.learning_preference),
                selectinload(LearnerProfile.accessibility_preference),
            )
            .where(LearnerProfile.user_id == user_id)
        )
        result = await db.execute(stmt)
        profile = result.scalar_one_or_none()

        if not profile:
            profile = LearnerProfile(
                user_id=user_id,
                full_name=default_name,
            )
            db.add(profile)
            await db.flush()

            learning_pref = LearningPreference(learner_profile_id=profile.id)
            a11y_pref = AccessibilityPreference(learner_profile_id=profile.id)
            db.add_all([learning_pref, a11y_pref])
            await db.commit()

            # Reload with relationships
            result = await db.execute(stmt)
            profile = result.scalar_one()

        return profile

    @classmethod
    async def update_profile(
        cls, db: AsyncSession, user_id: uuid.UUID, payload: LearnerProfileUpdate
    ) -> LearnerProfile:
        profile = await cls.get_or_create_profile(db, user_id)

        # Update scalar profile fields
        if payload.full_name is not None:
            profile.full_name = payload.full_name
        if payload.age is not None:
            profile.age = payload.age
        if payload.grade is not None:
            profile.grade = payload.grade
        if payload.preferred_language is not None:
            profile.preferred_language = payload.preferred_language
        if payload.learning_pace is not None:
            profile.learning_pace = payload.learning_pace
        if payload.preferred_content_type is not None:
            profile.preferred_content_type = payload.preferred_content_type

        # Update learning preferences
        if payload.learning_preferences is not None:
            if not profile.learning_preference:
                profile.learning_preference = LearningPreference(learner_profile_id=profile.id)
                db.add(profile.learning_preference)
            
            lp_data = payload.learning_preferences.model_dump(exclude_unset=True)
            for key, val in lp_data.items():
                if hasattr(profile.learning_preference, key):
                    setattr(profile.learning_preference, key, val)

        # Update accessibility preferences
        if payload.accessibility_preferences is not None:
            if not profile.accessibility_preference:
                profile.accessibility_preference = AccessibilityPreference(learner_profile_id=profile.id)
                db.add(profile.accessibility_preference)
                
            a11y_data = payload.accessibility_preferences.model_dump(exclude_unset=True)
            for key, val in a11y_data.items():
                if hasattr(profile.accessibility_preference, key):
                    setattr(profile.accessibility_preference, key, val)

        await db.commit()
        await db.refresh(profile)

        # Reload fully with relationships
        stmt = (
            select(LearnerProfile)
            .options(
                selectinload(LearnerProfile.learning_preference),
                selectinload(LearnerProfile.accessibility_preference),
            )
            .where(LearnerProfile.id == profile.id)
        )
        res = await db.execute(stmt)
        return res.scalar_one()
