import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.curriculum import ContentDifficulty, ContentType
from app.models.adaptive import LearningPathStatus, PathItemStatus


class LearningPathItemResponse(BaseModel):
    id: uuid.UUID
    learning_path_id: uuid.UUID
    content_id: uuid.UUID
    content_title: str
    topic_id: uuid.UUID
    topic_name: str
    topic_code: str
    difficulty: ContentDifficulty
    content_type: ContentType
    estimated_duration_minutes: int
    sequence_number: int
    status: PathItemStatus
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LearningPathItemUpdate(BaseModel):
    status: PathItemStatus


class LearningPathResponse(BaseModel):
    id: uuid.UUID
    learner_profile_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None
    subject_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    status: LearningPathStatus
    total_items: int
    completed_items: int
    progress_percentage: float
    total_estimated_duration_minutes: int
    items: List[LearningPathItemResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GenerateLearningPathRequest(BaseModel):
    subject_id: Optional[uuid.UUID] = None
    max_items: int = 8
