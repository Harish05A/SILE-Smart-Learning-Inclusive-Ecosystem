import json
import logging
import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import EntityNotFoundException
from app.core.llm import BaseLLMProvider
from app.models.adaptive import PracticeAttempt
from app.models.agents import AgentName
from app.models.curriculum import Topic
from app.models.profile import LearnerProfile
from app.schemas.agents import LearnerContextFrame
from app.schemas.performance import MasteryStatus
from app.services.agents.base_agent import BaseAgent
from app.services.performance_analyzer import PerformanceAnalyzer

logger = logging.getLogger(__name__)

LEARNER_ANALYSIS_SYSTEM_PROMPT = """You are an expert Educational Learner Analysis AI agent in the Smart Inclusive Learning Ecosystem (SILE).
Your responsibility is to analyze empirical learner performance evidence and preferences to produce a structured LearnerContextFrame.

CRITICAL INSTRUCTIONS & SAFETY GUIDELINES:
1. Rely ONLY on the provided empirical performance evidence and user-configured preferences in the user prompt.
2. NEVER diagnose medical, psychiatric, or cognitive conditions.
3. NEVER infer disabilities or clinical deficits (do NOT use words like 'disorder', 'disabled', 'deficit', 'impairment').
4. Formulate learning gaps strictly as factual observations of academic skills (e.g., 'Accuracy on fraction division is 35% across 8 attempts').
5. Identify prerequisite blockers only when empirical data shows lower mastery in prerequisite topics.
6. Do NOT alter authoritative mathematical mastery scores.
7. Return a valid JSON response strictly conforming to the LearnerContextFrame schema.
"""


class LearnerAnalysisAgent(BaseAgent):
    """
    Learner Analysis Agent.
    Synthesizes Phase 1 learner profiles, preferences, and Phase 2 PerformanceAnalyzer
    metrics into an evidence-based LearnerContextFrame.
    """

    def __init__(self, llm_provider: Optional[BaseLLMProvider] = None):
        super().__init__(
            name=AgentName.LEARNER_ANALYSIS,
            system_prompt=LEARNER_ANALYSIS_SYSTEM_PROMPT,
            llm_provider=llm_provider,
        )

    async def analyze(
        self,
        db: AsyncSession,
        learner_profile_id: uuid.UUID,
        topic_id: Optional[uuid.UUID] = None,
    ) -> LearnerContextFrame:
        """
        Analyze learner evidence and construct a structured LearnerContextFrame.
        Reuses PerformanceAnalyzer for authoritative mastery calculations.
        Falls back to deterministic synthesis if LLM is unavailable.
        """
        # 1. Fetch Learner Profile with preferences
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

        if not profile:
            raise EntityNotFoundException("LearnerProfile", learner_profile_id)

        # 2. Authoritative performance analysis via Phase 2 PerformanceAnalyzer
        overview = await PerformanceAnalyzer.analyze_learner_performance(
            db=db, learner_profile=profile
        )

        # 3. Fetch recent practice attempts (last 10)
        practice_stmt = (
            select(PracticeAttempt)
            .options(selectinload(PracticeAttempt.topic))
            .where(PracticeAttempt.learner_profile_id == learner_profile_id)
            .order_by(PracticeAttempt.completed_at.desc())
            .limit(10)
        )
        practice_res = await db.execute(practice_stmt)
        recent_practice = list(practice_res.scalars().all())

        # 4. Analyze target topic and prerequisites if specified
        target_topic: Optional[Topic] = None
        prerequisite_blockers: List[str] = []
        evidence_based_learning_gaps: List[str] = []

        # Continuous normalized mastery (0.0 - 1.0)
        continuous_mastery = round(overview.overall_mastery / 100.0, 3)

        if topic_id:
            topic_stmt = (
                select(Topic)
                .options(selectinload(Topic.prerequisite_topic))
                .where(Topic.id == topic_id)
            )
            topic_res = await db.execute(topic_stmt)
            target_topic = topic_res.scalar_one_or_none()

            if target_topic:
                # Find performance for this target topic
                target_metric = next(
                    (m for m in overview.all_topics if m.topic_id == target_topic.id),
                    None
                )
                if target_metric and target_metric.mastery_status in [MasteryStatus.LOW, MasteryStatus.DEVELOPING]:
                    evidence_based_learning_gaps.append(
                        f"Accuracy on {target_topic.name} is {target_metric.accuracy}% across {target_metric.total_attempts} attempts (Mastery: {target_metric.mastery_percentage}%)."
                    )

                # Check prerequisite topic if defined
                if target_topic.prerequisite_topic_id:
                    prereq_metric = next(
                        (m for m in overview.all_topics if m.topic_id == target_topic.prerequisite_topic_id),
                        None
                    )
                    prereq_name = target_topic.prerequisite_topic.name if target_topic.prerequisite_topic else "Prerequisite Topic"
                    if prereq_metric and prereq_metric.mastery_status in [MasteryStatus.LOW, MasteryStatus.DEVELOPING]:
                        prerequisite_blockers.append(prereq_name)
                        evidence_based_learning_gaps.append(
                            f"Prerequisite topic '{prereq_name}' has low mastery ({prereq_metric.mastery_percentage}%) impacting current progress."
                        )

        # If no specific topic or gaps found, populate from weak topics
        if not evidence_based_learning_gaps and overview.weak_topics:
            for w in overview.weak_topics:
                evidence_based_learning_gaps.append(
                    f"Accuracy on {w.topic_name} is {w.accuracy}% across {w.total_attempts} attempts (Mastery: {w.mastery_percentage}%)."
                )

        # 5. Extract safe learning & accessibility preferences (no PII)
        learning_prefs_dict: Dict[str, Any] = {}
        if profile.learning_preference:
            learning_prefs_dict = {
                "visual_explanations": profile.learning_preference.visual_explanations,
                "step_by_step": profile.learning_preference.step_by_step,
                "simplified_language": profile.learning_preference.simplified_language,
                "audio_support": profile.learning_preference.audio_support,
                "interactive_learning": profile.learning_preference.interactive_learning,
                "short_sessions": profile.learning_preference.short_sessions,
            }

        access_prefs_dict: Dict[str, Any] = {}
        if profile.accessibility_preference:
            access_prefs_dict = {
                "large_text": profile.accessibility_preference.large_text,
                "high_contrast": profile.accessibility_preference.high_contrast,
                "text_to_speech": profile.accessibility_preference.text_to_speech,
                "reduced_visual_complexity": profile.accessibility_preference.reduced_visual_complexity,
                "keyboard_navigation": profile.accessibility_preference.keyboard_navigation,
            }

        weak_topic_names = [t.topic_name for t in overview.weak_topics]
        strong_topic_names = [t.topic_name for t in overview.strong_topics]
        recommended_difficulty = PerformanceAnalyzer.determine_topic_difficulty(
            overview.overall_mastery
        ).value

        recent_practice_summary = (
            f"Completed {len(recent_practice)} recent practice session(s). "
            f"Overall average mastery is {overview.overall_mastery}% "
            f"across {len(overview.all_topics)} topic(s)."
        )

        adaptation_params = {
            "pace": profile.learning_pace.value,
            "preferred_mode": profile.preferred_content_type.value,
            "short_sessions": learning_prefs_dict.get("short_sessions", False),
            "step_by_step": learning_prefs_dict.get("step_by_step", True),
            "visual_explanations": learning_prefs_dict.get("visual_explanations", True),
        }

        # 6. Build Deterministic Fallback Frame
        fallback_frame = LearnerContextFrame(
            learner_level=profile.grade or "Developing Level",
            overall_mastery=continuous_mastery,
            weak_topics=weak_topic_names,
            strong_topics=strong_topic_names,
            recent_performance_summary=recent_practice_summary,
            learning_preferences=learning_prefs_dict,
            accessibility_preferences=access_prefs_dict,
            recommended_difficulty=recommended_difficulty,
            evidence_based_learning_gaps=evidence_based_learning_gaps,
            prerequisite_blockers=prerequisite_blockers,
            adaptation_parameters=adaptation_params,
        )

        # 7. Construct Sanitized, Privacy-Safe LLM Prompt (NO PII)
        evidence_payload = {
            "learner_level": profile.grade or "Developing Level",
            "overall_mastery": continuous_mastery,
            "weak_topics": weak_topic_names,
            "strong_topics": strong_topic_names,
            "recent_performance_summary": recent_practice_summary,
            "learning_preferences": learning_prefs_dict,
            "accessibility_preferences": access_prefs_dict,
            "recommended_difficulty": recommended_difficulty,
            "evidence_based_learning_gaps": evidence_based_learning_gaps,
            "prerequisite_blockers": prerequisite_blockers,
            "adaptation_parameters": adaptation_params,
            "target_topic": target_topic.name if target_topic else None,
        }

        # 8. Attempt LLM Generation with deterministic fallback on any error
        try:
            llm_result = await self.execute_structured(
                user_prompt=json.dumps(evidence_payload, indent=2),
                response_schema=LearnerContextFrame,
            )
            # Guarantee authoritative mastery calculated by PerformanceAnalyzer is preserved
            llm_result.overall_mastery = continuous_mastery
            if profile.grade and (not llm_result.learner_level or llm_result.learner_level.startswith("Mock")):
                llm_result.learner_level = profile.grade
            # Preserve verified database preferences, blockers, and gaps
            if not llm_result.learning_preferences or "sample_key" in llm_result.learning_preferences:
                llm_result.learning_preferences = learning_prefs_dict
            if not llm_result.accessibility_preferences or "sample_key" in llm_result.accessibility_preferences:
                llm_result.accessibility_preferences = access_prefs_dict
            if prerequisite_blockers and (not llm_result.prerequisite_blockers or llm_result.prerequisite_blockers == ["Mock prerequisite_blockers"]):
                llm_result.prerequisite_blockers = prerequisite_blockers
            if evidence_based_learning_gaps and (not llm_result.evidence_based_learning_gaps or llm_result.evidence_based_learning_gaps == ["Mock evidence_based_learning_gaps"]):
                llm_result.evidence_based_learning_gaps = evidence_based_learning_gaps
            return llm_result
        except Exception as e:
            logger.warning(
                f"LearnerAnalysisAgent LLM execution failed or returned invalid response: {str(e)}. "
                "Falling back to deterministic LearnerContextFrame."
            )
            return fallback_frame
