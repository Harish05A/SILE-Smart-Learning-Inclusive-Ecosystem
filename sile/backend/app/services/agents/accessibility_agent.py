import json
import logging
from typing import Any, Dict, List, Optional

from app.core.llm import BaseLLMProvider
from app.models.agents import AgentName
from app.schemas.agents import (
    AccessibilityAdaptationResult,
    ContentAdaptationResult,
    LearnerContextFrame,
)
from app.services.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)

ACCESSIBILITY_SYSTEM_PROMPT = """You are an expert Educational Accessibility AI agent in the Smart Inclusive Learning Ecosystem (SILE).
Your responsibility is to transform the presentation of educational content to maximize accessibility, clarity, and cognitive comfort.

CRITICAL INSTRUCTIONS & SAFETY GUIDELINES:
1. The provided educational content is the AUTHORITATIVE source. You must preserve its factual meaning, learning objective, and subject matter.
2. Transform PRESENTATION (plain language, semantic headings, structured bullet lists, numbered steps, screen-reader friendly flow, predictable layouts), NOT the curriculum scope.
3. Accommodate user-configured accessibility and learning preferences (e.g. high contrast presentation, reduced visual complexity, step-by-step layout, plain language).
4. NEVER diagnose medical, psychiatric, or cognitive conditions (do NOT use terms like 'disorder', 'disabled', 'deficit', 'impairment', 'adhd', 'autism'). Accessibility preferences are presentation choices, NOT medical diagnoses.
5. Provide a concise plain-language summary and a clear outline of the content structure.
6. Return a valid JSON response strictly conforming to the AccessibilityAdaptationResult schema.
"""


class AccessibilityAgent(BaseAgent):
    """
    Specialized Accessibility Agent.
    Transforms adapted educational content into screen-reader friendly,
    plain-language, structured presentations tailored to learner accessibility preferences.
    """

    def __init__(self, llm_provider: Optional[BaseLLMProvider] = None):
        super().__init__(
            name=AgentName.ACCESSIBILITY,
            system_prompt=ACCESSIBILITY_SYSTEM_PROMPT,
            llm_provider=llm_provider,
        )

    async def adapt_accessibility(
        self,
        learner_context: LearnerContextFrame,
        adapted_content: Optional[ContentAdaptationResult] = None,
        raw_content: Optional[str] = None,
        title: Optional[str] = None,
    ) -> AccessibilityAdaptationResult:
        """
        Adapt educational presentation to match learner accessibility and layout preferences.
        Preserves original learning objectives and factual meaning.
        """
        # 1. Resolve source text and title
        source_title = (
            title
            or (adapted_content.title if adapted_content else "Learning Lesson")
        )
        source_explanation = (
            adapted_content.adapted_explanation
            if adapted_content
            else (raw_content or "Core learning content.")
        )
        key_concepts = (
            adapted_content.key_concepts
            if adapted_content and adapted_content.key_concepts
            else ["Core Concept", source_title]
        )
        scaffolding = (
            adapted_content.scaffolding_steps
            if adapted_content and adapted_content.scaffolding_steps
            else []
        )

        # 2. Build Deterministic Fallback
        fallback_result = self._build_deterministic_fallback(
            source_title=source_title,
            source_explanation=source_explanation,
            key_concepts=key_concepts,
            scaffolding=scaffolding,
            learner_context=learner_context,
        )

        # 3. Construct Sanitized, Privacy-Safe Prompt Payload (NO PII)
        prompt_payload = {
            "source_lesson": {
                "title": source_title,
                "explanation": source_explanation,
                "key_concepts": key_concepts,
                "scaffolding_steps": scaffolding,
            },
            "accessibility_context": {
                "accessibility_preferences": learner_context.accessibility_preferences,
                "learning_preferences": learner_context.learning_preferences,
                "learner_level": learner_context.learner_level,
                "recommended_difficulty": learner_context.recommended_difficulty,
            }
        }

        # 4. Attempt Structured LLM Generation with Fallback Protection
        try:
            llm_result = await self.execute_structured(
                user_prompt=json.dumps(prompt_payload, indent=2),
                response_schema=AccessibilityAdaptationResult,
            )

            # Ensure essential accessibility fields are present
            if not llm_result.accessible_content or llm_result.accessible_content.startswith("Mock"):
                llm_result.accessible_content = fallback_result.accessible_content
            if not llm_result.plain_language_summary or llm_result.plain_language_summary.startswith("Mock"):
                llm_result.plain_language_summary = fallback_result.plain_language_summary
            if not llm_result.content_structure:
                llm_result.content_structure = fallback_result.content_structure
            if not llm_result.recommended_presentation or "sample_key" in llm_result.recommended_presentation:
                llm_result.recommended_presentation = fallback_result.recommended_presentation

            return llm_result
        except Exception as e:
            logger.warning(
                f"AccessibilityAgent LLM execution failed or returned invalid response: {str(e)}. "
                "Returning deterministic AccessibilityAdaptationResult fallback."
            )
            return fallback_result

    def _build_deterministic_fallback(
        self,
        source_title: str,
        source_explanation: str,
        key_concepts: List[str],
        scaffolding: List[str],
        learner_context: LearnerContextFrame,
    ) -> AccessibilityAdaptationResult:
        """Construct high-quality structured deterministic accessible presentation."""
        access_prefs = learner_context.accessibility_preferences or {}
        learn_prefs = learner_context.learning_preferences or {}

        # Plain language summary
        plain_language_summary = (
            f"This lesson explains {source_title}. "
            f"You will learn about {', '.join(key_concepts[:3])} through structured steps."
        )

        # Accessible structured markdown
        lines = [
            f"# {source_title}",
            "",
            "## Overview",
            plain_language_summary,
            "",
            "## Key Concepts",
        ]
        for concept in key_concepts:
            lines.append(f"- **{concept}**")

        lines.extend([
            "",
            "## Lesson Details",
            source_explanation,
        ])

        if scaffolding:
            lines.extend([
                "",
                "## Step-by-Step Learning Guide",
            ])
            for idx, step in enumerate(scaffolding, 1):
                lines.append(f"{idx}. {step}")

        accessible_content = "\n".join(lines)

        content_structure = [
            "1. Title & Overview",
            "2. Key Concepts (Bullet List)",
            "3. Lesson Details (Plain Language)",
            "4. Step-by-Step Guide",
        ]

        presentation_config = {
            "high_contrast_theme": access_prefs.get("high_contrast", False),
            "large_text_font": access_prefs.get("large_text", False),
            "text_to_speech_compatible": access_prefs.get("text_to_speech", True),
            "reduced_visual_complexity": access_prefs.get("reduced_visual_complexity", False),
            "screen_reader_reading_order": "linear_semantic",
            "step_by_step_pacing": learn_prefs.get("step_by_step", True),
        }

        accessibility_rationale = (
            f"Content organized with semantic hierarchy, plain language overview, "
            f"and structured lists configured for accessibility preferences."
        )

        return AccessibilityAdaptationResult(
            accessible_content=accessible_content,
            plain_language_summary=plain_language_summary,
            content_structure=content_structure,
            recommended_presentation=presentation_config,
            accessibility_rationale=accessibility_rationale,
        )
