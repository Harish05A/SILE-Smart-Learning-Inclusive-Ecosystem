import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.profile import LearningPace, PreferredContentType
from app.models.assessment import LearningLevel


class DashboardProfileSummary(BaseModel):
    full_name: str
    age: Optional[int] = None
    grade: Optional[str] = None
    preferred_language: str
    learning_pace: LearningPace
    preferred_content_type: PreferredContentType

    model_config = ConfigDict(from_attributes=True)


class DashboardLearningPreferencesSummary(BaseModel):
    visual_explanations: bool
    step_by_step: bool
    simplified_language: bool
    audio_support: bool
    interactive_learning: bool
    short_sessions: bool

    model_config = ConfigDict(from_attributes=True)


class DashboardAccessibilityPreferencesSummary(BaseModel):
    large_text: bool
    high_contrast: bool
    text_to_speech: bool
    reduced_visual_complexity: bool
    keyboard_navigation: bool

    model_config = ConfigDict(from_attributes=True)


class AssessmentHistoryItem(BaseModel):
    attempt_id: uuid.UUID
    assessment_id: uuid.UUID
    assessment_title: str
    subject: str
    score: float
    total_questions: int
    percentage: float
    learning_level: LearningLevel
    completed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardOverviewResponse(BaseModel):
    user_id: uuid.UUID
    email: str
    full_name: str
    profile_completion_percentage: int
    profile: DashboardProfileSummary
    learning_preferences: DashboardLearningPreferencesSummary
    accessibility_preferences: DashboardAccessibilityPreferencesSummary
    baseline_status: str  # "completed" | "not_started"
    latest_assessment: Optional[AssessmentHistoryItem] = None
    assessment_history: List[AssessmentHistoryItem] = []
    active_assessment_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)
