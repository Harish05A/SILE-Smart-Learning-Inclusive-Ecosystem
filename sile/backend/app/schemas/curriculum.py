import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.curriculum import ContentDifficulty


class SkillResponse(BaseModel):
    id: uuid.UUID
    topic_id: uuid.UUID
    name: str
    description: Optional[str] = None
    difficulty_level: ContentDifficulty
    order_number: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TopicResponse(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    prerequisite_topic_id: Optional[uuid.UUID] = None
    code: str
    name: str
    description: Optional[str] = None
    order_number: int
    skills_count: int = 0
    contents_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TopicDetailResponse(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    prerequisite_topic_id: Optional[uuid.UUID] = None
    code: str
    name: str
    description: Optional[str] = None
    order_number: int
    skills: List[SkillResponse] = []
    contents_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubjectResponse(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: Optional[str] = None
    order_number: int
    topics_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubjectDetailResponse(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: Optional[str] = None
    order_number: int
    topics: List[TopicResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
