from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    profiles,
    preferences,
    assessments,
    dashboard,
    curriculum,
    content,
    learning_paths,
    practice,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(profiles.router, prefix="/learner", tags=["Learner Profile"])
api_router.include_router(profiles.router, prefix="/learners", tags=["Learner Profile"])
api_router.include_router(profiles.router, prefix="/profiles", tags=["Learner Profile"])
api_router.include_router(preferences.router, prefix="/preferences", tags=["Preferences"])
api_router.include_router(assessments.router, prefix="/assessments", tags=["Baseline Assessment"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Learner Dashboard"])

# Phase 2 Learning Content & Curriculum Endpoints
api_router.include_router(curriculum.router, prefix="/curriculum", tags=["Curriculum"])
api_router.include_router(curriculum.router, prefix="", tags=["Curriculum Direct"])  # exposes /subjects & /topics directly
api_router.include_router(content.router, prefix="/content", tags=["Learning Content"])

# Phase 2 Personalized Learning Paths Endpoints
api_router.include_router(learning_paths.router, prefix="/learners/me/learning-paths", tags=["Learning Paths"])
api_router.include_router(learning_paths.router, prefix="/learner/learning-paths", tags=["Learning Paths"])
api_router.include_router(learning_paths.router, prefix="/learning-paths", tags=["Learning Paths Direct"])

# Phase 2 Adaptive Practice Endpoints
api_router.include_router(practice.router, prefix="/practice", tags=["Adaptive Practice"])
api_router.include_router(practice.router, prefix="/learners/me/practice", tags=["Adaptive Practice"])
