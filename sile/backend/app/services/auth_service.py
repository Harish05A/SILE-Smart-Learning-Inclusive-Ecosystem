import uuid
from typing import Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AuthenticationFailedException, ConflictException
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.models.user import User, UserRole
from app.models.profile import LearnerProfile, LearningPace, PreferredContentType
from app.models.preference import LearningPreference
from app.models.accessibility import AccessibilityPreference
from app.schemas.auth import RegisterRequest, LoginRequest


class AuthService:
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        stmt = (
            select(User)
            .options(
                selectinload(User.learner_profile).selectinload(LearnerProfile.learning_preference),
                selectinload(User.learner_profile).selectinload(LearnerProfile.accessibility_preference),
            )
            .where(User.email == email.lower().strip())
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
        stmt = (
            select(User)
            .options(
                selectinload(User.learner_profile).selectinload(LearnerProfile.learning_preference),
                selectinload(User.learner_profile).selectinload(LearnerProfile.accessibility_preference),
            )
            .where(User.id == user_id)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @classmethod
    async def register(cls, db: AsyncSession, payload: RegisterRequest) -> Tuple[User, str, str]:
        # 1. Check if email already registered
        existing_user = await cls.get_user_by_email(db, payload.email)
        if existing_user:
            raise ConflictException("An account with this email address already exists.")

        # 2. Hash password securely
        password_hash = get_password_hash(payload.password)

        # 3. Create User entity
        user = User(
            email=payload.email.lower().strip(),
            password_hash=password_hash,
            role=UserRole.LEARNER,
            is_active=True,
        )
        db.add(user)
        await db.flush()

        # 4. Create associated initial LearnerProfile
        profile = LearnerProfile(
            user_id=user.id,
            full_name=payload.full_name.strip(),
            preferred_language="en",
            learning_pace=LearningPace.MODERATE,
            preferred_content_type=PreferredContentType.MIXED,
        )
        db.add(profile)
        await db.flush()

        # 5. Create default preferences
        learning_pref = LearningPreference(
            learner_profile_id=profile.id,
            visual_explanations=True,
            step_by_step=True,
            simplified_language=False,
            audio_support=False,
            interactive_learning=True,
            short_sessions=False,
        )
        a11y_pref = AccessibilityPreference(
            learner_profile_id=profile.id,
            large_text=False,
            high_contrast=False,
            text_to_speech=False,
            reduced_visual_complexity=False,
            keyboard_navigation=False,
        )
        db.add_all([learning_pref, a11y_pref])
        await db.commit()

        # Re-fetch user with relationships loaded
        created_user = await cls.get_user_by_id(db, user.id)

        # 6. Generate JWT tokens
        access_token = create_access_token(subject=str(user.id))
        refresh_token = create_refresh_token(subject=str(user.id))

        return created_user, access_token, refresh_token

    @classmethod
    async def authenticate(cls, db: AsyncSession, payload: LoginRequest) -> Tuple[User, str, str]:
        user = await cls.get_user_by_email(db, payload.email)
        if not user or not verify_password(payload.password, user.password_hash):
            raise AuthenticationFailedException("Invalid email or password.")

        if not user.is_active:
            raise AuthenticationFailedException("User account is inactive. Please contact support.")

        access_token = create_access_token(subject=str(user.id))
        refresh_token = create_refresh_token(subject=str(user.id))

        return user, access_token, refresh_token
