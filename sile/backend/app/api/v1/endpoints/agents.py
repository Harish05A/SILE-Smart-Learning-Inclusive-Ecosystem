import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.exceptions import EntityNotFoundException, ValidationException
from app.db.session import get_db
from app.models.curriculum import LearningContent, Topic
from app.models.user import User
from app.schemas.agents import (
    AgentComparisonEvaluationCreate,
    AgentComparisonEvaluationResponse,
    AgentSessionCreate,
    MultiAgentResponse,
)
from app.services.agent_comparison import AgentComparisonService
from app.services.agents.coordinator_agent import CoordinatorAgent
from app.services.profile_service import ProfileService

router = APIRouter()


@router.post(
    "/coordinate",
    response_model=MultiAgentResponse,
    status_code=status.HTTP_200_OK,
    summary="Orchestrate Multi-Agent Pedagogical Session",
    description=(
        "Coordinates specialized pedagogical agents (Learner Analysis, Content Adaptation, "
        "Formative Assessment, and Accessibility) into an integrated learning payload."
    ),
)
async def coordinate_agent_session(
    payload: AgentSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MultiAgentResponse:
    """
    Executes the multi-agent orchestration DAG for the authenticated learner:
    1. Validates context and ensures learner ownership.
    2. Runs LearnerAnalysisAgent -> ContentAdaptationAgent -> AssessmentAgent -> AccessibilityAgent.
    3. Persists AgentSession and audit AgentInteraction logs.
    4. Returns structured MultiAgentResponse.
    """
    profile = await ProfileService.get_or_create_profile(db, current_user.id)

    # Validate existence of topic if specified
    if payload.topic_id:
        topic_record = await db.get(Topic, payload.topic_id)
        if not topic_record:
            raise EntityNotFoundException("Topic", payload.topic_id)

    # Validate existence of content if specified
    if payload.content_id:
        content_record = await db.get(LearningContent, payload.content_id)
        if not content_record:
            raise EntityNotFoundException("LearningContent", payload.content_id)

    coordinator = CoordinatorAgent()
    return await coordinator.coordinate(
        db=db,
        learner_profile_id=profile.id,
        session_type=payload.session_type,
        topic_id=payload.topic_id,
        content_id=payload.content_id,
        user_inquiry=payload.user_inquiry,
    )


@router.post(
    "/comparisons",
    response_model=AgentComparisonEvaluationResponse,
    status_code=status.HTTP_200_OK,
    summary="Create or Record Rule-Based vs Multi-Agent Comparison Evaluation",
    description=(
        "Generates and records structured comparison metrics between Phase 2 deterministic "
        "baseline and Phase 3 multi-agent outputs, optionally recording learner rating (1-5)."
    ),
)
async def create_or_update_comparison(
    payload: AgentComparisonEvaluationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentComparisonEvaluationResponse:
    """
    Generates deterministic Phase 2 baseline and compares with Phase 3 multi-agent outputs.
    Persists evaluation record in agent_comparison_evaluations table.
    """
    profile = await ProfileService.get_or_create_profile(db, current_user.id)

    return await AgentComparisonService.create_or_update_evaluation(
        db=db,
        session_id=payload.session_id,
        learner_profile_id=profile.id,
        learner_rating=payload.learner_rating,
        notes=payload.notes,
        rule_based_override=payload.rule_based_output,
        multi_agent_override=payload.multi_agent_output,
    )


@router.get(
    "/comparisons",
    response_model=List[AgentComparisonEvaluationResponse],
    status_code=status.HTTP_200_OK,
    summary="List Comparative Evaluations for Authenticated Learner",
    description="Returns recorded comparison evaluations to support research and dataset analysis.",
)
async def list_comparisons(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[AgentComparisonEvaluationResponse]:
    """
    Lists comparative evaluations for research/dataset export.
    """
    profile = await ProfileService.get_or_create_profile(db, current_user.id)
    return await AgentComparisonService.list_evaluations(
        db=db,
        learner_profile_id=profile.id,
        limit=limit,
    )


@router.get(
    "/comparisons/{session_id}",
    response_model=AgentComparisonEvaluationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Comparison Evaluation by Session ID",
    description="Retrieves a specific comparison evaluation record ensuring learner ownership.",
)
async def get_comparison_by_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentComparisonEvaluationResponse:
    """
    Retrieves comparative evaluation for a given session.
    """
    profile = await ProfileService.get_or_create_profile(db, current_user.id)
    return await AgentComparisonService.get_evaluation(
        db=db,
        session_id=session_id,
        learner_profile_id=profile.id,
    )
