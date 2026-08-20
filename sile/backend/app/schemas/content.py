import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict
from app.models.curriculum import ContentDifficulty, ContentType


class LearningContentSummaryResponse(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    subject_name: Optional[str] = None
    topic_id: uuid.UUID
    topic_name: Optional[str] = None
    skill_id: Optional[uuid.UUID] = None
    skill_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    content_type: ContentType
    difficulty_level: ContentDifficulty
    estimated_duration_minutes: int
    prerequisites: Optional[Union[List[str], Dict[str, Any], Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LearningContentDetailResponse(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    subject_name: Optional[str] = None
    topic_id: uuid.UUID
    topic_name: Optional[str] = None
    skill_id: Optional[uuid.UUID] = None
    skill_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    content_type: ContentType
    content_body: str
    media_payload: Optional[Union[Dict[str, Any], List[Any], Any]] = None
    difficulty_level: ContentDifficulty
    estimated_duration_minutes: int
    prerequisites: Optional[Union[List[str], Dict[str, Any], Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
