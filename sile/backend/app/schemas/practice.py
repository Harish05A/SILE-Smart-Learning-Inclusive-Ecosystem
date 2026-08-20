import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict
from app.models.curriculum import ContentDifficulty
from app.schemas.performance import MasteryStatus


class PracticeQuestionResponse(BaseModel):
    id: uuid.UUID
    topic_id: uuid.UUID
    topic_name: str
    topic_code: str
    question_text: str
    options: Union[List[Dict[str, Any]], Dict[str, Any], Any]
    difficulty: ContentDifficulty
    hint: Optional[str] = None
    order_number: int

    model_config = ConfigDict(from_attributes=True)


class GeneratePracticeSessionRequest(BaseModel):
    topic_id: uuid.UUID
    num_questions: int = 5


class PracticeSessionResponse(BaseModel):
    topic_id: uuid.UUID
    topic_name: str
    topic_code: str
    calibrated_difficulty: ContentDifficulty
    mastery_percentage: float
    total_questions: int
    questions: List[PracticeQuestionResponse] = []

    model_config = ConfigDict(from_attributes=True)


class PracticeAnswerSubmission(BaseModel):
    question_id: uuid.UUID
    selected_answer: str


class SubmitPracticeSessionRequest(BaseModel):
    topic_id: uuid.UUID
    content_id: Optional[uuid.UUID] = None
    answers: List[PracticeAnswerSubmission]


class QuestionReviewItem(BaseModel):
    question_id: uuid.UUID
    question_text: str
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: Optional[str] = None


class PracticeResultResponse(BaseModel):
    attempt_id: uuid.UUID
    topic_id: uuid.UUID
    topic_name: str
    score: float
    total_questions: int
    percentage: float
    difficulty: ContentDifficulty
    previous_mastery: float
    updated_mastery: float
    mastery_status: MasteryStatus
    difficulty_adjusted_to: ContentDifficulty
    recommended_next_action: str
    next_content_id: Optional[uuid.UUID] = None
    reviews: List[QuestionReviewItem] = []
    completed_at: datetime

    model_config = ConfigDict(from_attributes=True)
