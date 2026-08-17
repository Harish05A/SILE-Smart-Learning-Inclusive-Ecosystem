import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.profile import LearningPace, PreferredContentType
from app.schemas.preference import LearningPreferenceResponse, LearningPreferenceUpdate
from app.schemas.accessibility import AccessibilityPreferenceResponse, AccessibilityPreferenceUpdate


class LearnerProfileBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    age: Optional[int] = Field(None, ge=3, le=120)
    grade: Optional[str] = Field(None, max_length=50)
    preferred_language: str = Field("en", max_length=50)
    learning_pace: LearningPace = LearningPace.MODERATE
    preferred_content_type: PreferredContentType = PreferredContentType.MIXED


class LearnerProfileCreate(LearnerProfileBase):
    pass


class LearnerProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    age: Optional[int] = Field(None, ge=3, le=120)
    grade: Optional[str] = Field(None, max_length=50)
    preferred_language: Optional[str] = Field(None, max_length=50)
    learning_pace: Optional[LearningPace] = None
    preferred_content_type: Optional[PreferredContentType] = None
    learning_preferences: Optional[LearningPreferenceUpdate] = None
    accessibility_preferences: Optional[AccessibilityPreferenceUpdate] = None


class LearnerProfileResponse(LearnerProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LearnerProfileDetailsResponse(LearnerProfileResponse):
    learning_preference: Optional[LearningPreferenceResponse] = None
    accessibility_preference: Optional[AccessibilityPreferenceResponse] = None

    model_config = ConfigDict(from_attributes=True)
