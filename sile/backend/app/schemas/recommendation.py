import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.curriculum import ContentDifficulty, ContentType
from app.models.adaptive import RecommendationPriority, RecommendationStatus


class RecommendationItemResponse(BaseModel):
    id: uuid.UUID
    topic_id: uuid.UUID
    topic_name: str
    topic_code: str
    content_id: Optional[uuid.UUID] = None
    content_title: Optional[str] = None
    content_type: Optional[ContentType] = None
    difficulty: ContentDifficulty
    estimated_duration_minutes: int
    priority: RecommendationPriority
    status: RecommendationStatus
    reason: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LearnerRecommendationsResponse(BaseModel):
    learner_id: uuid.UUID
    total_recommendations: int
    recommendations: List[RecommendationItemResponse]
    generated_at: datetime

    model_config = ConfigDict(from_attributes=True)
