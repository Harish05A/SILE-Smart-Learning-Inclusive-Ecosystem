# Phase 1 Models & Enums
from app.models.user import User, UserRole
from app.models.profile import LearnerProfile, LearningPace, PreferredContentType
from app.models.preference import LearningPreference
from app.models.accessibility import AccessibilityPreference
from app.models.assessment import (
    Assessment,
    AssessmentQuestion,
    AssessmentAttempt,
    AssessmentAnswer,
    QuestionDifficulty,
    LearningLevel,
)

# Phase 2 Adaptive Learning Models & Enums
from app.models.curriculum import (
    Subject,
    Topic,
    Skill,
    LearningContent,
    ContentDifficulty,
    ContentType,
)
from app.models.adaptive import (
    TopicPerformance,
    LearningRecommendation,
    LearningPath,
    LearningPathItem,
    PracticeAttempt,
    RecommendationPriority,
    RecommendationStatus,
    LearningPathStatus,
    PathItemStatus,
)
from app.models.practice import PracticeQuestion

__all__ = [
    # Phase 1
    "User",
    "UserRole",
    "LearnerProfile",
    "LearningPace",
    "PreferredContentType",
    "LearningPreference",
    "AccessibilityPreference",
    "Assessment",
    "AssessmentQuestion",
    "AssessmentAttempt",
    "AssessmentAnswer",
    "QuestionDifficulty",
    "LearningLevel",
    # Phase 2 Curriculum
    "Subject",
    "Topic",
    "Skill",
    "LearningContent",
    "ContentDifficulty",
    "ContentType",
    # Phase 2 Adaptive Engine
    "TopicPerformance",
    "LearningRecommendation",
    "LearningPath",
    "LearningPathItem",
    "PracticeAttempt",
    "PracticeQuestion",
    "RecommendationPriority",
    "RecommendationStatus",
    "LearningPathStatus",
    "PathItemStatus",
]
