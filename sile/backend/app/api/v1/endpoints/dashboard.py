from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.api.dependencies import get_current_user
from app.schemas.dashboard import DashboardOverviewResponse
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/overview", response_model=DashboardOverviewResponse, summary="Get Learner Dashboard Overview")
async def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve real learner metrics, profile completion, preferences summary,
    and baseline assessment performance history.
    """
    overview = await DashboardService.get_dashboard_overview(db, current_user)
    return overview


@router.get("", response_model=DashboardOverviewResponse, summary="Get Learner Dashboard (Alias)")
async def get_dashboard_root(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Root alias for dashboard overview."""
    return await DashboardService.get_dashboard_overview(db, current_user)
