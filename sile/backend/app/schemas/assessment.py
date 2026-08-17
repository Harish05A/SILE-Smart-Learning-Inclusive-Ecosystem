import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field
from app.models.assessment import QuestionDifficulty, LearningLevel


class OptionItem(BaseModel):
    key: str
    text: str


OptionSchema = OptionItem


class AssessmentListItemResponse(BaseModel):
    id: uuid.UUID
    title: str
    subject: str
    description: Optional[str] = None
    total_questions: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


AssessmentResponse = AssessmentListItemResponse


class AssessmentQuestionPublicResponse(BaseModel):
    id: uuid.UUID
    question_text: str
    options: Union[List[Dict[str, Any]], Dict[str, Any], Any]
    difficulty: QuestionDifficulty
    order_number: int

    model_config = ConfigDict(from_attributes=True)


AssessmentQuestionResponse = AssessmentQuestionPublicResponse


class AssessmentDetailResponse(BaseModel):
    id: uuid.UUID
    title: str
    subject: str
    description: Optional[str] = None
    total_questions: int
    questions: List[AssessmentQuestionPublicResponse]

    model_config = ConfigDict(from_attributes=True)


class QuestionAnswerSubmission(BaseModel):
    question_id: uuid.UUID
    selected_answer: str = Field(..., min_length=1, max_length=255)


AssessmentAnswerSubmission = QuestionAnswerSubmission


class AssessmentAttemptSubmission(BaseModel):
    answers: List[QuestionAnswerSubmission]


class AssessmentAnswerDetailResponse(BaseModel):
    question_id: uuid.UUID
    question_text: str
    selected_answer: str
    correct_answer: str
    is_correct: bool


class AssessmentAttemptResultResponse(BaseModel):
    attempt_id: uuid.UUID
    assessment_id: uuid.UUID
    assessment_title: str
    score: float
    total_questions: int
    percentage: float
    learning_level: LearningLevel
    correct_count: int
    incorrect_count: int
    completed_at: datetime
    answers_summary: List[AssessmentAnswerDetailResponse] = []

    model_config = ConfigDict(from_attributes=True)


AssessmentAttemptResponse = AssessmentAttemptResultResponse
