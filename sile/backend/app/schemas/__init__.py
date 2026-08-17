from app.schemas.common import StandardResponse, ErrorResponse, ErrorDetail
from app.schemas.auth import (
    Token,
    TokenPayload,
    LoginRequest,
    RegisterRequest,
    AuthResponse,
    RefreshTokenRequest,
)
from app.schemas.user import UserBase, UserUpdate, UserResponse
from app.schemas.profile import (
    LearnerProfileBase,
    LearnerProfileCreate,
    LearnerProfileUpdate,
    LearnerProfileResponse,
)
from app.schemas.preference import (
    LearningPreferenceBase,
    LearningPreferenceCreate,
    LearningPreferenceUpdate,
    LearningPreferenceResponse,
)
from app.schemas.accessibility import (
    AccessibilityPreferenceBase,
    AccessibilityPreferenceCreate,
    AccessibilityPreferenceUpdate,
    AccessibilityPreferenceResponse,
)
from app.schemas.assessment import (
    OptionSchema,
    AssessmentResponse,
    AssessmentQuestionResponse,
    AssessmentAttemptResponse,
    AssessmentAnswerSubmission,
)
from app.schemas.dashboard import DashboardOverviewResponse

__all__ = [
    "StandardResponse",
    "ErrorResponse",
    "ErrorDetail",
    "Token",
    "TokenPayload",
    "LoginRequest",
    "RegisterRequest",
    "AuthResponse",
    "RefreshTokenRequest",
    "UserBase",
    "UserUpdate",
    "UserResponse",
    "LearnerProfileBase",
    "LearnerProfileCreate",
    "LearnerProfileUpdate",
    "LearnerProfileResponse",
    "LearningPreferenceBase",
    "LearningPreferenceCreate",
    "LearningPreferenceUpdate",
    "LearningPreferenceResponse",
    "AccessibilityPreferenceBase",
    "AccessibilityPreferenceCreate",
    "AccessibilityPreferenceUpdate",
    "AccessibilityPreferenceResponse",
    "OptionSchema",
    "AssessmentResponse",
    "AssessmentQuestionResponse",
    "AssessmentAttemptResponse",
    "AssessmentAnswerSubmission",
    "DashboardOverviewResponse",
]
