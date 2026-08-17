from fastapi import APIRouter
from app.api.v1.endpoints import auth, profiles, preferences, assessments, dashboard

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(profiles.router, prefix="/learner", tags=["Learner Profile"])
api_router.include_router(profiles.router, prefix="/profiles", tags=["Learner Profile"])
api_router.include_router(preferences.router, prefix="/preferences", tags=["Preferences"])
api_router.include_router(assessments.router, prefix="/assessments", tags=["Baseline Assessment"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Learner Dashboard"])
