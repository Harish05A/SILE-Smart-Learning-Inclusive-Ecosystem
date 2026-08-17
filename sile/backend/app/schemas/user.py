import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr
from app.models.user import UserRole
from app.schemas.profile import LearnerProfileResponse


class UserBase(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.LEARNER


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    learner_profile: Optional[LearnerProfileResponse] = None

    model_config = ConfigDict(from_attributes=True)
