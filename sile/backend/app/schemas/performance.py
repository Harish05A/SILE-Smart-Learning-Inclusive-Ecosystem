import enum
import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.curriculum import ContentDifficulty


class MasteryStatus(str, enum.Enum):
    LOW = "low"  # < 40% (Needs Reinforcement / Weak)
    DEVELOPING = "developing"  # 40%–69%
    GOOD = "good"  # 70%–84%
    HIGH = "high"  # 85%+ (Strong / Mastered)


class TopicPerformanceMetric(BaseModel):
    topic_id: uuid.UUID
    topic_code: str
    topic_name: str
    subject_name: str
    total_attempts: int
    correct_answers: int
    incorrect_answers: int
    accuracy: float  # Lifetime accuracy % (0.0 - 100.0)
    recent_accuracy: float  # Recent window accuracy % (0.0 - 100.0)
    mastery_score: float  # Continuous index (0.0 - 1.0)
    mastery_percentage: float  # Mastery score as percentage (0.0 - 100.0)
    mastery_status: MasteryStatus
    current_difficulty: ContentDifficulty
    last_attempted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LearnerPerformanceOverviewResponse(BaseModel):
    learner_id: uuid.UUID
    full_name: str
    overall_accuracy: float
    overall_mastery: float
    total_questions_attempted: int
    strong_topics: List[TopicPerformanceMetric] = []
    developing_topics: List[TopicPerformanceMetric] = []
    weak_topics: List[TopicPerformanceMetric] = []
    all_topics: List[TopicPerformanceMetric] = []
    last_analyzed_at: datetime

    model_config = ConfigDict(from_attributes=True)
