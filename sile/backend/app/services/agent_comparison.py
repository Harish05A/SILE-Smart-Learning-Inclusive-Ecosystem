import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import EntityNotFoundException, ValidationException
from app.models.agents import (
    AgentComparisonEvaluation,
    AgentInteraction,
    AgentName,
    AgentSession,
    InteractionStatus,
    SessionType,
)
from app.models.curriculum import LearningContent, Topic
from app.models.profile import LearnerProfile
from app.services.performance_analyzer import PerformanceAnalyzer

logger = logging.getLogger(__name__)


class AgentComparisonService:
    """
    Research and comparative evaluation service contrasting:
    Phase 2: Deterministic Rule-Based Adaptive Engine Baseline
             VS
    Phase 3: Multi-Agent Intelligent Ecosystem Outputs

    Evaluates across 7 concrete pedagogical dimensions without fabricating metrics:
    1. relevance
    2. personalization
    3. accessibility
    4. pedagogical usefulness
    5. learning-gap alignment
    6. response completeness
    7. learner preference alignment
    """

    @staticmethod
    async def generate_deterministic_baseline(
        db: AsyncSession,
        learner_profile_id: uuid.UUID,
        session: AgentSession,
    ) -> Dict[str, Any]:
        """
        Generate the deterministic Phase 2 baseline for the given session's learning context.
        Uses pure rule-based calculations from PerformanceAnalyzer and static curriculum models.
        """
        topic: Optional[Topic] = None
        if session.topic_id:
            topic_result = await db.execute(select(Topic).where(Topic.id == session.topic_id))
            topic = topic_result.scalar_one_or_none()

        content: Optional[LearningContent] = None
        if session.content_id:
            content_result = await db.execute(
                select(LearningContent).where(LearningContent.id == session.content_id)
            )
            content = content_result.scalar_one_or_none()

        # Fetch learner profile with preferences
        profile_stmt = (
            select(LearnerProfile)
            .options(
                selectinload(LearnerProfile.learning_preference),
                selectinload(LearnerProfile.accessibility_preference),
            )
            .where(LearnerProfile.id == learner_profile_id)
        )
        profile_res = await db.execute(profile_stmt)
        profile = profile_res.scalar_one_or_none()

        # Phase 2 Rule-based performance calculation
        mastery_score = 0.50
        mastery_status_val = "developing"
        recommended_difficulty = "developing"

        if profile:
            try:
                overview = await PerformanceAnalyzer.analyze_learner_performance(
                    db=db,
                    learner_profile=profile,
                )
                if topic:
                    topic_metric = next(
                        (m for m in overview.all_topics if m.topic_id == topic.id), None
                    )
                    if topic_metric:
                        mastery_score = topic_metric.mastery_score
                        mastery_status_val = topic_metric.mastery_status.value
                        recommended_difficulty = topic_metric.current_difficulty.value
                else:
                    mastery_score = overview.overall_mastery
                    mastery_status_val = "developing"
                    recommended_difficulty = "developing"
            except Exception as e:
                logger.warning(f"Error calculating baseline mastery for topic {session.topic_id}: {e}")

        accessibility_prefs = {}
        if profile and profile.accessibility_preference:
            accessibility_prefs = {
                "large_text": profile.accessibility_preference.large_text,
                "high_contrast": profile.accessibility_preference.high_contrast,
                "text_to_speech": profile.accessibility_preference.text_to_speech,
                "reduced_visual_complexity": profile.accessibility_preference.reduced_visual_complexity,
                "keyboard_navigation": profile.accessibility_preference.keyboard_navigation,
            }

        raw_difficulty = "developing"
        if content:
            raw_difficulty = (
                content.difficulty_level.value
                if hasattr(content.difficulty_level, "value")
                else str(content.difficulty_level)
            )

        return {
            "approach": "rule_based_deterministic_baseline",
            "phase": "phase_2",
            "topic_id": str(session.topic_id) if session.topic_id else None,
            "topic_name": topic.name if topic else None,
            "content_id": str(session.content_id) if session.content_id else None,
            "raw_curriculum_title": content.title if content else None,
            "raw_curriculum_body": content.content_body if content else None,
            "curriculum_difficulty": raw_difficulty,
            "calculated_mastery_score": mastery_score,
            "calculated_mastery_status": mastery_status_val,
            "recommended_difficulty": recommended_difficulty,
            "raw_accessibility_preferences": accessibility_prefs,
            "has_scaffolded_worked_examples": False,
            "has_targeted_plain_language": False,
            "has_distractor_misconception_hints": False,
        }

    @staticmethod
    async def get_multi_agent_output(
        db: AsyncSession,
        session: AgentSession,
    ) -> Dict[str, Any]:
        """
        Extract the coordinated multi-agent output from session interactions.
        """
        interactions_query = await db.execute(
            select(AgentInteraction)
            .where(AgentInteraction.session_id == session.id)
            .order_by(AgentInteraction.created_at)
        )
        interactions = interactions_query.scalars().all()

        learner_context = None
        adapted_content = None
        assessment = None
        accessibility = None
        total_latency_ms = 0
        agents_run: List[str] = []

        for interaction in interactions:
            total_latency_ms += interaction.latency_ms
            agents_run.append(interaction.agent_name.value)

            if (
                interaction.agent_name == AgentName.LEARNER_ANALYSIS
                and interaction.status == InteractionStatus.COMPLETED
            ):
                learner_context = interaction.output_payload
            elif (
                interaction.agent_name == AgentName.CONTENT_ADAPTATION
                and interaction.status == InteractionStatus.COMPLETED
            ):
                adapted_content = interaction.output_payload
            elif (
                interaction.agent_name == AgentName.ASSESSMENT
                and interaction.status == InteractionStatus.COMPLETED
            ):
                assessment = interaction.output_payload
            elif (
                interaction.agent_name == AgentName.ACCESSIBILITY
                and interaction.status == InteractionStatus.COMPLETED
            ):
                accessibility = interaction.output_payload

        return {
            "approach": "multi_agent_intelligence",
            "phase": "phase_3",
            "session_id": str(session.id),
            "session_type": session.session_type.value,
            "learner_context": learner_context,
            "adapted_content": adapted_content,
            "assessment": assessment,
            "accessibility_adaptation": accessibility,
            "coordinated_agents": agents_run,
            "total_latency_ms": total_latency_ms,
        }

    @staticmethod
    def evaluate_comparison_dimensions(
        rule_based: Dict[str, Any],
        multi_agent: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Evaluate structural and pedagogical differences across the 7 defined dimensions.
        Does NOT fabricate hypothetical learning gains; strictly observes concrete structural evidence.
        """
        adapted_content = multi_agent.get("adapted_content") or {}
        assessment = multi_agent.get("assessment") or {}
        accessibility = multi_agent.get("accessibility_adaptation") or {}
        learner_ctx = multi_agent.get("learner_context") or {}

        # 1. Relevance: Both systems anchor on target curriculum topic/content
        topic_aligned = bool(
            rule_based.get("topic_name")
            or learner_ctx.get("target_topic_id")
            or multi_agent.get("session_type")
        )
        relevance_evidence = (
            "Multi-agent output explicitly grounded in target topic and session context."
            if topic_aligned
            else "General pedagogical inquiry without explicit topic binding."
        )

        # 2. Personalization: Compare fixed rule bucket vs multi-agent individualized breakdown
        worked_examples = adapted_content.get("worked_examples") or []
        scaffolding_steps = adapted_content.get("scaffolding_steps") or []
        personalization_evidence = {
            "rule_based": f"Categorical difficulty mapping ({rule_based.get('recommended_difficulty', 'developing')})",
            "multi_agent": f"Individualized explanation with {len(scaffolding_steps)} scaffolding steps and {len(worked_examples)} worked examples",
        }

        # 3. Accessibility: Structural plain language & presentation adjustments
        plain_lang = accessibility.get("plain_language_summary")
        accessibility_evidence = {
            "rule_based_plain_language": False,
            "multi_agent_plain_language": bool(plain_lang),
            "applied_adaptations": accessibility.get("applied_adaptations", []),
        }

        # 4. Pedagogical Usefulness: Worked examples and step-by-step breakdowns
        pedagogical_evidence = {
            "rule_based_has_worked_examples": False,
            "multi_agent_worked_examples_count": len(worked_examples),
            "multi_agent_has_learning_objective": bool(adapted_content.get("learning_objective")),
        }

        # 5. Learning-Gap Alignment: Explicit targeting of diagnostic skill gaps
        evidence_gaps = learner_ctx.get("evidence_based_learning_gaps") or []
        learning_gap_evidence = {
            "identified_gaps_count": len(evidence_gaps),
            "targeted_in_adaptation": bool(adapted_content.get("adaptation_rationale")),
        }

        # 6. Response Completeness: Presence of key structural components
        completeness = {
            "has_learner_context": bool(learner_ctx),
            "has_adapted_content": bool(adapted_content),
            "has_assessment": bool(assessment),
            "has_accessibility": bool(accessibility),
        }

        # 7. Learner Preference Alignment: Visual support and scaffolding
        visual_needed = learner_ctx.get("visual_support_needed", False)
        visual_included = bool(
            adapted_content.get("visual_representation")
            or (rule_based.get("raw_curriculum_body") and "media_payload" in rule_based)
        )
        preference_evidence = {
            "visual_support_requested": visual_needed,
            "visual_representation_provided": visual_included,
        }

        return {
            "dimensions": {
                "relevance": relevance_evidence,
                "personalization": personalization_evidence,
                "accessibility": accessibility_evidence,
                "pedagogical_usefulness": pedagogical_evidence,
                "learning_gap_alignment": learning_gap_evidence,
                "response_completeness": completeness,
                "learner_preference_alignment": preference_evidence,
            },
            "metrics": {
                "rule_based_mastery_score": rule_based.get("calculated_mastery_score"),
                "multi_agent_latency_ms": multi_agent.get("total_latency_ms", 0),
                "multi_agent_worked_examples_count": len(worked_examples),
                "multi_agent_scaffolding_steps_count": len(scaffolding_steps),
                "has_plain_language_summary": bool(plain_lang),
            },
        }

    @staticmethod
    async def create_or_update_evaluation(
        db: AsyncSession,
        session_id: uuid.UUID,
        learner_profile_id: uuid.UUID,
        learner_rating: Optional[int] = None,
        notes: Optional[str] = None,
        rule_based_override: Optional[Dict[str, Any]] = None,
        multi_agent_override: Optional[Dict[str, Any]] = None,
    ) -> AgentComparisonEvaluation:
        """
        Create or update an AgentComparisonEvaluation record for the given session.
        Enforces:
        - Session existence and learner profile ownership.
        - Learner rating range validation (1..5).
        - Generation and persistence of comparison dimensions without fake metrics.
        """
        if learner_rating is not None and not (1 <= learner_rating <= 5):
            raise ValidationException(
                message="Learner rating must be an integer between 1 and 5 (inclusive).",
                details={"field": "learner_rating"},
            )

        # Retrieve session with learner ownership check
        session_query = await db.execute(
            select(AgentSession).where(AgentSession.id == session_id)
        )
        session = session_query.scalar_one_or_none()

        if not session:
            raise EntityNotFoundException("AgentSession", session_id)

        if session.learner_profile_id != learner_profile_id:
            raise EntityNotFoundException("AgentSession", session_id)

        # Obtain rule-based output
        if rule_based_override is not None:
            rule_based_output = rule_based_override
        else:
            rule_based_output = await AgentComparisonService.generate_deterministic_baseline(
                db=db,
                learner_profile_id=learner_profile_id,
                session=session,
            )

        # Obtain multi-agent output
        if multi_agent_override is not None:
            multi_agent_output = multi_agent_override
        else:
            multi_agent_output = await AgentComparisonService.get_multi_agent_output(
                db=db,
                session=session,
            )

        # Compute structured dimension comparison
        comparison_analysis = AgentComparisonService.evaluate_comparison_dimensions(
            rule_based=rule_based_output,
            multi_agent=multi_agent_output,
        )

        # Enrich rule_based and multi_agent outputs with comparative evaluation metadata
        rule_based_output["evaluation_dimensions"] = comparison_analysis["dimensions"]
        rule_based_output["evaluation_metrics"] = comparison_analysis["metrics"]

        # Check if an evaluation already exists for this session
        eval_query = await db.execute(
            select(AgentComparisonEvaluation).where(
                AgentComparisonEvaluation.session_id == session_id
            )
        )
        existing_eval = eval_query.scalar_one_or_none()

        if existing_eval:
            existing_eval.rule_based_output = rule_based_output
            existing_eval.multi_agent_output = multi_agent_output
            if learner_rating is not None:
                existing_eval.learner_rating = learner_rating
            if notes is not None:
                existing_eval.notes = notes
            db.add(existing_eval)
            await db.commit()
            await db.refresh(existing_eval)
            return existing_eval

        # Create new evaluation record
        evaluation = AgentComparisonEvaluation(
            session_id=session_id,
            rule_based_output=rule_based_output,
            multi_agent_output=multi_agent_output,
            learner_rating=learner_rating,
            notes=notes,
        )
        db.add(evaluation)
        await db.commit()
        await db.refresh(evaluation)
        return evaluation

    @staticmethod
    async def get_evaluation(
        db: AsyncSession,
        session_id: uuid.UUID,
        learner_profile_id: uuid.UUID,
    ) -> AgentComparisonEvaluation:
        """
        Retrieve an AgentComparisonEvaluation for a specific session ensuring ownership.
        """
        query = await db.execute(
            select(AgentComparisonEvaluation)
            .join(AgentSession, AgentComparisonEvaluation.session_id == AgentSession.id)
            .where(
                AgentComparisonEvaluation.session_id == session_id,
                AgentSession.learner_profile_id == learner_profile_id,
            )
        )
        evaluation = query.scalar_one_or_none()
        if not evaluation:
            raise EntityNotFoundException("AgentComparisonEvaluation", session_id)
        return evaluation

    @staticmethod
    async def list_evaluations(
        db: AsyncSession,
        learner_profile_id: uuid.UUID,
        limit: int = 50,
    ) -> List[AgentComparisonEvaluation]:
        """
        List comparative evaluation records for the authenticated learner.
        Supports research analysis and dataset export.
        """
        query = await db.execute(
            select(AgentComparisonEvaluation)
            .join(AgentSession, AgentComparisonEvaluation.session_id == AgentSession.id)
            .where(AgentSession.learner_profile_id == learner_profile_id)
            .order_by(AgentComparisonEvaluation.created_at.desc())
            .limit(limit)
        )
        return list(query.scalars().all())
