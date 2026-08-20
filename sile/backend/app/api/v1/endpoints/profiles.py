from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.api.dependencies import get_current_user
from app.schemas.profile import (
    LearnerProfileDetailsResponse,
    LearnerProfileUpdate,
)
from app.schemas.performance import LearnerPerformanceOverviewResponse
from app.schemas.recommendation import LearnerRecommendationsResponse
from app.services.profile_service import ProfileService
from app.services.performance_analyzer import PerformanceAnalyzer
from app.services.recommendation_engine import RecommendationEngine

router = APIRouter()


@router.get("/profile", response_model=LearnerProfileDetailsResponse, summary="Get Current Learner Profile")
async def get_learner_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the current authenticated user's learner profile and preferences."""
    profile = await ProfileService.get_or_create_profile(db, current_user.id)
    return profile


@router.put("/profile", response_model=LearnerProfileDetailsResponse, summary="Update Learner Profile")
async def update_learner_profile(
    payload: LearnerProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update profile attributes, learning preferences, and accessibility preferences."""
    updated_profile = await ProfileService.update_profile(db, current_user.id, payload)
    return updated_profile


@router.get("/performance", response_model=LearnerPerformanceOverviewResponse, summary="Get Learner Topic Performance")
@router.get("/me/performance", response_model=LearnerPerformanceOverviewResponse, summary="Get Learner Topic Performance")
async def get_learner_performance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve deterministic, explainable topic-wise performance metrics,
    mastery levels, and weak/developing/strong categorization for the authenticated learner.
    """
    profile = await ProfileService.get_or_create_profile(db, current_user.id)
    return await PerformanceAnalyzer.analyze_learner_performance(db, profile)


@router.get("/recommendations", response_model=LearnerRecommendationsResponse, summary="Get Personalized Learning Recommendations")
@router.get("/me/recommendations", response_model=LearnerRecommendationsResponse, summary="Get Personalized Learning Recommendations")
async def get_learner_recommendations(
    limit: int = Query(5, ge=1, le=20, description="Max recommendations to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a prioritized list of explainable learning recommendations
    based on mastery gaps, prerequisites, learning style, and session preferences.
    """
    profile = await ProfileService.get_or_create_profile(db, current_user.id)
    return await RecommendationEngine.generate_recommendations(db, profile, limit=limit)
