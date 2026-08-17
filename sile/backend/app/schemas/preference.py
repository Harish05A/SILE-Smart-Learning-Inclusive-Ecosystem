import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class LearningPreferenceBase(BaseModel):
    visual_explanations: bool = True
    step_by_step: bool = True
    simplified_language: bool = False
    audio_support: bool = False
    interactive_learning: bool = True
    short_sessions: bool = False


class LearningPreferenceCreate(LearningPreferenceBase):
    pass


class LearningPreferenceUpdate(BaseModel):
    visual_explanations: Optional[bool] = None
    step_by_step: Optional[bool] = None
    simplified_language: Optional[bool] = None
    audio_support: Optional[bool] = None
    interactive_learning: Optional[bool] = None
    short_sessions: Optional[bool] = None


class LearningPreferenceResponse(LearningPreferenceBase):
    id: uuid.UUID
    learner_profile_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
