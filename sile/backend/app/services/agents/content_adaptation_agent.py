import json
import logging
import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import EntityNotFoundException
from app.core.llm import BaseLLMProvider
from app.models.agents import AgentName
from app.models.curriculum import LearningContent, Topic
from app.schemas.agents import ContentAdaptationResult, LearnerContextFrame, WorkedExample
from app.services.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)

CONTENT_ADAPTATION_SYSTEM_PROMPT = """You are an expert Educational Content Adaptation AI agent in the Smart Inclusive Learning Ecosystem (SILE).
Your role is to adapt the presentation of authoritative learning content to match a specific learner's context frame.

CRITICAL INSTRUCTIONS & SAFETY GUIDELINES:
1. The provided source learning content is the AUTHORITATIVE source. You must preserve its learning objective and subject matter.
2. Adapt the PRESENTATION (tone, scaffolding, worked examples, step size, visual metaphors), NOT the curriculum scope.
3. NEVER introduce unsupported or fabricated curriculum facts.
4. NEVER alter the core topic or teach an unrelated topic.
5. Rely ONLY on the provided empirical learner evidence and user-configured preferences.
6. NEVER diagnose medical, psychiatric, or cognitive conditions (do NOT use terms like 'disorder', 'disabled', 'deficit', 'impairment', 'adhd', 'autism').
7. Accommodate user-configured accessibility and learning preferences (e.g. high contrast presentation, step-by-step pacing, plain language) without making medical inferences.
8. Include 1 to 3 relevant, step-by-step worked examples suitable for the learner's recommended difficulty.
9. Return a valid JSON response strictly conforming to the ContentAdaptationResult schema.
"""


class ContentAdaptationAgent(BaseAgent):
    """
    Specialized Content Adaptation Agent.
    Transforms authoritative Phase 2 curriculum content into personalized,
    pedagogically adapted learning material tailored to a LearnerContextFrame.
    """

    def __init__(self, llm_provider: Optional[BaseLLMProvider] = None):
        super().__init__(
            name=AgentName.CONTENT_ADAPTATION,
            system_prompt=CONTENT_ADAPTATION_SYSTEM_PROMPT,
            llm_provider=llm_provider,
        )

    async def adapt(
        self,
        db: AsyncSession,
        learner_context: LearnerContextFrame,
        content_id: Optional[uuid.UUID] = None,
        topic_id: Optional[uuid.UUID] = None,
    ) -> ContentAdaptationResult:
        """
        Adapt source learning content grounded in Phase 2 curriculum records.
        Uses LearnerContextFrame for personalization and falls back to deterministic adaptation on failure.
        """
        # 1. Retrieve authoritative source content from Database
        source_content = await self._resolve_source_content(
            db=db,
            content_id=content_id,
            topic_id=topic_id,
            learner_context=learner_context,
        )

        if not source_content:
            target_identifier = str(content_id or topic_id or "default")
            raise EntityNotFoundException("LearningContent", target_identifier)

        topic_name = source_content.topic.name if source_content.topic else "General Concept"
        subject_name = (
            source_content.subject.name
            if source_content.subject
            else (source_content.topic.subject.name if source_content.topic and source_content.topic.subject else "Curriculum")
        )

        # 2. Build Deterministic Fallback Result
        fallback_result = self._build_deterministic_fallback(
            source_content=source_content,
            topic_name=topic_name,
            learner_context=learner_context,
        )

        # 3. Construct Sanitized, Privacy-Safe LLM Prompt (NO PII)
        prompt_payload = {
            "source_content": {
                "title": source_content.title,
                "subject": subject_name,
                "topic": topic_name,
                "content_type": source_content.content_type.value,
                "difficulty_level": source_content.difficulty_level.value,
                "original_content_body": source_content.content_body,
                "estimated_duration_minutes": source_content.estimated_duration_minutes,
            },
            "learner_context": {
                "learner_level": learner_context.learner_level,
                "overall_mastery": learner_context.overall_mastery,
                "recommended_difficulty": learner_context.recommended_difficulty,
                "weak_topics": learner_context.weak_topics,
                "strong_topics": learner_context.strong_topics,
                "learning_gaps": learner_context.evidence_based_learning_gaps,
                "prerequisite_blockers": learner_context.prerequisite_blockers,
                "learning_preferences": learner_context.learning_preferences,
                "accessibility_preferences": learner_context.accessibility_preferences,
                "adaptation_parameters": learner_context.adaptation_parameters,
            }
        }

        # 4. Attempt Structured LLM Generation with Fallback Protection
        try:
            llm_result = await self.execute_structured(
                user_prompt=json.dumps(prompt_payload, indent=2),
                response_schema=ContentAdaptationResult,
            )
            # Ensure title remains strongly tied to the source content
            if not llm_result.title or llm_result.title.startswith("Mock"):
                llm_result.title = f"Adapted: {source_content.title}"
            if not llm_result.key_concepts:
                llm_result.key_concepts = fallback_result.key_concepts
            if not llm_result.worked_examples:
                llm_result.worked_examples = fallback_result.worked_examples
            if not llm_result.scaffolding_steps:
                llm_result.scaffolding_steps = fallback_result.scaffolding_steps
            if not llm_result.complexity_level or llm_result.complexity_level.startswith("Mock"):
                llm_result.complexity_level = fallback_result.complexity_level
            return llm_result
        except Exception as e:
            logger.warning(
                f"ContentAdaptationAgent LLM execution failed or returned invalid response: {str(e)}. "
                "Returning deterministic ContentAdaptationResult fallback."
            )
            return fallback_result

    async def _resolve_source_content(
        self,
        db: AsyncSession,
        content_id: Optional[uuid.UUID],
        topic_id: Optional[uuid.UUID],
        learner_context: LearnerContextFrame,
    ) -> Optional[LearningContent]:
        """Resolve and load the source LearningContent with relations."""
        if content_id:
            stmt = (
                select(LearningContent)
                .options(
                    selectinload(LearningContent.topic).selectinload(Topic.subject),
                    selectinload(LearningContent.subject),
                )
                .where(LearningContent.id == content_id)
            )
            res = await db.execute(stmt)
            content = res.scalar_one_or_none()
            if content:
                return content

        if topic_id:
            stmt = (
                select(LearningContent)
                .options(
                    selectinload(LearningContent.topic).selectinload(Topic.subject),
                    selectinload(LearningContent.subject),
                )
                .where(LearningContent.topic_id == topic_id)
                .order_by(LearningContent.created_at.asc())
            )
            res = await db.execute(stmt)
            content = res.scalars().first()
            if content:
                return content

        # Fallback: find content by weak topics or first available content
        if learner_context.weak_topics:
            weak_topic_stmt = (
                select(Topic)
                .where(Topic.name.in_(learner_context.weak_topics))
            )
            topic_res = await db.execute(weak_topic_stmt)
            weak_topic_record = topic_res.scalars().first()
            if weak_topic_record:
                content_stmt = (
                    select(LearningContent)
                    .options(
                        selectinload(LearningContent.topic).selectinload(Topic.subject),
                        selectinload(LearningContent.subject),
                    )
                    .where(LearningContent.topic_id == weak_topic_record.id)
                )
                c_res = await db.execute(content_stmt)
                content = c_res.scalars().first()
                if content:
                    return content

        # Default fallback: first available content in DB
        any_content_stmt = (
            select(LearningContent)
            .options(
                selectinload(LearningContent.topic).selectinload(Topic.subject),
                selectinload(LearningContent.subject),
            )
            .limit(1)
        )
        any_res = await db.execute(any_content_stmt)
        return any_res.scalars().first()

    def _build_deterministic_fallback(
        self,
        source_content: LearningContent,
        topic_name: str,
        learner_context: LearnerContextFrame,
    ) -> ContentAdaptationResult:
        """Construct a high-quality deterministic adaptation when LLM is unavailable."""
        prefs = learner_context.learning_preferences or {}
        access = learner_context.accessibility_preferences or {}
        diff = learner_context.recommended_difficulty or "developing"
        mastery_pct = round(learner_context.overall_mastery * 100, 1)

        # Structure explanation based on preferences
        explanation_prefix = ""
        if prefs.get("step_by_step"):
            explanation_prefix = "Step-by-Step Breakdown:\n"
        if access.get("reduced_visual_complexity"):
            explanation_prefix += "[Simplified Layout Enabled]\n"

        adapted_explanation = (
            f"{explanation_prefix}"
            f"{source_content.content_body}\n\n"
            f"Key Takeaway: Master {topic_name} at the {diff} level through structured practice."
        )

        worked_examples = [
            WorkedExample(
                title=f"Worked Example: {source_content.title}",
                problem=f"Apply the core principles of {topic_name} to solve a representative task.",
                solution_steps=[
                    f"Step 1: Review the fundamental rule for {topic_name}.",
                    "Step 2: Break the problem into component steps.",
                    "Step 3: Execute the solution and verify correctness.",
                ],
                explanation=f"Demonstrates how to approach {topic_name} systematically.",
            )
        ]

        scaffolding_steps = [
            f"1. Activate prior knowledge related to {topic_name}.",
            "2. Follow the worked example step by step.",
            "3. Complete guided practice before attempting independent assessment.",
        ]

        if learner_context.prerequisite_blockers:
            scaffolding_steps.insert(
                0,
                f"Prerequisite Check: Review '{', '.join(learner_context.prerequisite_blockers)}' if needed."
            )

        adaptation_rationale = (
            f"Deterministically adapted presentation for {learner_context.learner_level} learner "
            f"with {mastery_pct}% overall mastery. Configured for {diff} level pacing and preferences."
        )

        return ContentAdaptationResult(
            title=f"Adapted: {source_content.title}",
            adapted_explanation=adapted_explanation,
            key_concepts=[source_content.title, topic_name],
            worked_examples=worked_examples,
            scaffolding_steps=scaffolding_steps,
            complexity_level=diff,
            adaptation_rationale=adaptation_rationale,
        )
