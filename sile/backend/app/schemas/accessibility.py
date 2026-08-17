import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AccessibilityPreferenceBase(BaseModel):
    large_text: bool = False
    high_contrast: bool = False
    text_to_speech: bool = False
    reduced_visual_complexity: bool = False
    keyboard_navigation: bool = False


class AccessibilityPreferenceCreate(AccessibilityPreferenceBase):
    pass


class AccessibilityPreferenceUpdate(BaseModel):
    large_text: Optional[bool] = None
    high_contrast: Optional[bool] = None
    text_to_speech: Optional[bool] = None
    reduced_visual_complexity: Optional[bool] = None
    keyboard_navigation: Optional[bool] = None


class AccessibilityPreferenceResponse(AccessibilityPreferenceBase):
    id: uuid.UUID
    learner_profile_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
