import logging
import time
import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundException, SileException
from app.core.llm import BaseLLMProvider, get_llm_provider
from app.models.agents import (
    AgentInteraction,
    AgentName,
    AgentSession,
    InteractionStatus,
    SessionStatus,
    SessionType,
)
from app.schemas.agents import (
    AccessibilityAdaptationResult,
    AgentInteractionResult,
    AssessmentQuestionResult,
    ContentAdaptationResult,
    LearnerContextFrame,
    MultiAgentResponse,
)
from app.services.agents.accessibility_agent import AccessibilityAgent
from app.services.agents.analysis_agent import LearnerAnalysisAgent
from app.services.agents.assessment_agent import AssessmentAgent
from app.services.agents.base_agent import BaseAgent
from app.services.agents.content_adaptation_agent import ContentAdaptationAgent

logger = logging.getLogger(__name__)

COORDINATOR_SYSTEM_PROMPT = """You are the master Coordinator AI Agent in the Smart Inclusive Learning Ecosystem (SILE).
Your role is to orchestrate specialized pedagogical agents (Learner Analysis, Content Adaptation, Assessment, and Accessibility)
into an integrated, coherent learning experience while preserving curriculum grounding and safety boundaries.
"""


class CoordinatorAgent(BaseAgent):
    """
    Master Coordinator Agent.
    Orchestrates specialized sub-agents into a unified learning flow:
    1. LearnerAnalysisAgent -> LearnerContextFrame
    2. ContentAdaptationAgent -> ContentAdaptationResult
    3. AssessmentAgent -> List[AssessmentQuestionResult] (if formative assessment/tutoring)
    4. AccessibilityAgent -> AccessibilityAdaptationResult
    
    Maintains complete audit logging in AgentSession and AgentInteraction records.
    """

    def __init__(
        self,
        llm_provider: Optional[BaseLLMProvider] = None,
        learner_analysis_agent: Optional[LearnerAnalysisAgent] = None,
        content_adaptation_agent: Optional[ContentAdaptationAgent] = None,
        assessment_agent: Optional[AssessmentAgent] = None,
        accessibility_agent: Optional[AccessibilityAgent] = None,
    ):
        provider = llm_provider or get_llm_provider()
        super().__init__(
            name=AgentName.COORDINATOR,
            system_prompt=COORDINATOR_SYSTEM_PROMPT,
            llm_provider=provider,
        )
        self.learner_analysis_agent = learner_analysis_agent or LearnerAnalysisAgent(llm_provider=provider)
        self.content_adaptation_agent = content_adaptation_agent or ContentAdaptationAgent(llm_provider=provider)
        self.assessment_agent = assessment_agent or AssessmentAgent(llm_provider=provider)
        self.accessibility_agent = accessibility_agent or AccessibilityAgent(llm_provider=provider)

    async def coordinate(
        self,
        db: AsyncSession,
        learner_profile_id: uuid.UUID,
        session_type: SessionType = SessionType.LESSON_ADAPTATION,
        topic_id: Optional[uuid.UUID] = None,
        content_id: Optional[uuid.UUID] = None,
        user_inquiry: Optional[str] = None,
    ) -> MultiAgentResponse:
        """
        Orchestrate the multi-agent DAG for the requested session type.
        Persists AgentSession and step-by-step AgentInteraction records.
        """
        # 1. Create and persist AgentSession
        agent_session = AgentSession(
            learner_profile_id=learner_profile_id,
            session_type=session_type,
            status=SessionStatus.ACTIVE,
            user_inquiry=user_inquiry,
            topic_id=topic_id,
            content_id=content_id,
        )
        db.add(agent_session)
        await db.commit()
        await db.refresh(agent_session)

        agent_results: List[AgentInteractionResult] = []
        learner_context: Optional[LearnerContextFrame] = None
        adapted_content: Optional[ContentAdaptationResult] = None
        assessment_questions: Optional[List[AssessmentQuestionResult]] = None
        accessibility_adaptation: Optional[AccessibilityAdaptationResult] = None

        try:
            # -------------------------------------------------------------
            # STEP 1: Learner Analysis Agent
            # -------------------------------------------------------------
            analysis_start = time.perf_counter()
            try:
                learner_context = await self.learner_analysis_agent.analyze(
                    db=db,
                    learner_profile_id=learner_profile_id,
                    topic_id=topic_id,
                )
                analysis_latency = int((time.perf_counter() - analysis_start) * 1000)
                await self._record_interaction(
                    db=db,
                    session_id=agent_session.id,
                    agent_name=AgentName.LEARNER_ANALYSIS,
                    input_payload={"topic_id": str(topic_id) if topic_id else None},
                    output_payload=learner_context.model_dump(),
                    status=InteractionStatus.COMPLETED,
                    latency_ms=analysis_latency,
                    agent_results=agent_results,
                )
            except Exception as e:
                analysis_latency = int((time.perf_counter() - analysis_start) * 1000)
                await self._record_interaction(
                    db=db,
                    session_id=agent_session.id,
                    agent_name=AgentName.LEARNER_ANALYSIS,
                    input_payload={"topic_id": str(topic_id) if topic_id else None},
                    output_payload={},
                    status=InteractionStatus.FAILED,
                    latency_ms=analysis_latency,
                    error_message=str(e),
                    agent_results=agent_results,
                )
                raise e

            # -------------------------------------------------------------
            # STEP 2: Content Adaptation Agent
            # -------------------------------------------------------------
            adaptation_start = time.perf_counter()
            try:
                adapted_content = await self.content_adaptation_agent.adapt(
                    db=db,
                    learner_context=learner_context,
                    content_id=content_id,
                    topic_id=topic_id,
                )
                adaptation_latency = int((time.perf_counter() - adaptation_start) * 1000)
                await self._record_interaction(
                    db=db,
                    session_id=agent_session.id,
                    agent_name=AgentName.CONTENT_ADAPTATION,
                    input_payload={
                        "content_id": str(content_id) if content_id else None,
                        "topic_id": str(topic_id) if topic_id else None,
                    },
                    output_payload=adapted_content.model_dump(),
                    status=InteractionStatus.COMPLETED,
                    latency_ms=adaptation_latency,
                    agent_results=agent_results,
                )
            except Exception as e:
                adaptation_latency = int((time.perf_counter() - adaptation_start) * 1000)
                logger.warning(f"ContentAdaptation step failed in coordinator: {str(e)}")
                await self._record_interaction(
                    db=db,
                    session_id=agent_session.id,
                    agent_name=AgentName.CONTENT_ADAPTATION,
                    input_payload={
                        "content_id": str(content_id) if content_id else None,
                        "topic_id": str(topic_id) if topic_id else None,
                    },
                    output_payload={},
                    status=InteractionStatus.FAILED,
                    latency_ms=adaptation_latency,
                    error_message=str(e),
                    agent_results=agent_results,
                )

            # -------------------------------------------------------------
            # STEP 3: Assessment Agent (Formative Assessment & Tutoring)
            # -------------------------------------------------------------
            if session_type in [SessionType.FORMATIVE_ASSESSMENT, SessionType.INTERACTIVE_TUTORING]:
                assess_start = time.perf_counter()
                try:
                    assessment_questions = await self.assessment_agent.generate_assessment(
                        db=db,
                        learner_context=learner_context,
                        content_id=content_id,
                        topic_id=topic_id,
                        adapted_content=adapted_content,
                    )
                    assess_latency = int((time.perf_counter() - assess_start) * 1000)
                    await self._record_interaction(
                        db=db,
                        session_id=agent_session.id,
                        agent_name=AgentName.ASSESSMENT,
                        input_payload={"topic_id": str(topic_id) if topic_id else None},
                        output_payload={"questions_count": len(assessment_questions)},
                        status=InteractionStatus.COMPLETED,
                        latency_ms=assess_latency,
                        agent_results=agent_results,
                    )
                except Exception as e:
                    assess_latency = int((time.perf_counter() - assess_start) * 1000)
                    logger.warning(f"Assessment step failed in coordinator: {str(e)}")
                    await self._record_interaction(
                        db=db,
                        session_id=agent_session.id,
                        agent_name=AgentName.ASSESSMENT,
                        input_payload={"topic_id": str(topic_id) if topic_id else None},
                        output_payload={},
                        status=InteractionStatus.FAILED,
                        latency_ms=assess_latency,
                        error_message=str(e),
                        agent_results=agent_results,
                    )

            # -------------------------------------------------------------
            # STEP 4: Accessibility Agent
            # -------------------------------------------------------------
            access_start = time.perf_counter()
            try:
                accessibility_adaptation = await self.accessibility_agent.adapt_accessibility(
                    learner_context=learner_context,
                    adapted_content=adapted_content,
                )
                access_latency = int((time.perf_counter() - access_start) * 1000)
                await self._record_interaction(
                    db=db,
                    session_id=agent_session.id,
                    agent_name=AgentName.ACCESSIBILITY,
                    input_payload={},
                    output_payload=accessibility_adaptation.model_dump(),
                    status=InteractionStatus.COMPLETED,
                    latency_ms=access_latency,
                    agent_results=agent_results,
                )
            except Exception as e:
                access_latency = int((time.perf_counter() - access_start) * 1000)
                logger.warning(f"Accessibility step failed in coordinator: {str(e)}")
                await self._record_interaction(
                    db=db,
                    session_id=agent_session.id,
                    agent_name=AgentName.ACCESSIBILITY,
                    input_payload={},
                    output_payload={},
                    status=InteractionStatus.FAILED,
                    latency_ms=access_latency,
                    error_message=str(e),
                    agent_results=agent_results,
                )

            # -------------------------------------------------------------
            # STEP 5: Finalize Session & Response
            # -------------------------------------------------------------
            agent_session.status = SessionStatus.COMPLETED
            await db.commit()

            summary = (
                f"Successfully orchestrated {session_type.value} workflow across "
                f"{len(agent_results)} specialized agent(s)."
            )

            return MultiAgentResponse(
                session_id=agent_session.id,
                learner_context=learner_context,
                adapted_content=adapted_content,
                assessment=assessment_questions,
                accessibility_adaptation=accessibility_adaptation,
                agent_results=agent_results,
                execution_summary=summary,
            )

        except Exception as unrecoverable_error:
            agent_session.status = SessionStatus.FAILED
            await db.commit()
            logger.error(f"Coordinator execution failed for session {agent_session.id}: {str(unrecoverable_error)}")
            raise unrecoverable_error

    async def _record_interaction(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        agent_name: AgentName,
        input_payload: Dict[str, Any],
        output_payload: Dict[str, Any],
        status: InteractionStatus,
        latency_ms: int,
        agent_results: List[AgentInteractionResult],
        error_message: Optional[str] = None,
    ) -> None:
        """Persist an individual AgentInteraction record in DB and trace list."""
        interaction = AgentInteraction(
            session_id=session_id,
            agent_name=agent_name,
            input_payload=input_payload,
            output_payload=output_payload,
            status=status,
            latency_ms=latency_ms,
            error_message=error_message,
        )
        db.add(interaction)
        await db.commit()

        agent_results.append(
            AgentInteractionResult(
                agent_name=agent_name,
                status=status,
                output=output_payload,
                latency_ms=latency_ms,
                error_message=error_message,
            )
        )
