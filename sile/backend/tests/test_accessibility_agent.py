import json
import pytest

from app.core.llm import BaseLLMProvider, MockLLMProvider, LLMProviderException
from app.schemas.agents import (
    AccessibilityAdaptationResult,
    ContentAdaptationResult,
    LearnerContextFrame,
    WorkedExample,
)
from app.services.agents.accessibility_agent import AccessibilityAgent


class RecordingMockProvider(MockLLMProvider):
    """Mock provider that records user prompts for PII and safety verification."""
    def __init__(self):
        super().__init__()
        self.recorded_prompts = []

    async def generate_structured(self, system_prompt, user_prompt, response_schema, temperature=0.2, **kwargs):
        self.recorded_prompts.append(user_prompt)
        return await super().generate_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_schema=response_schema,
            temperature=temperature,
            **kwargs
        )


class FailingMockProvider(BaseLLMProvider):
    """Mock provider that simulates LLM network or API failure."""
    async def generate_structured(self, system_prompt, user_prompt, response_schema, temperature=0.2, **kwargs):
        raise LLMProviderException("Simulated API failure or timeout")


@pytest.mark.asyncio
async def test_accessibility_agent_full_transformation():
    """Test full accessibility transformation flow with LearnerContextFrame and ContentAdaptationResult."""
    learner_context = LearnerContextFrame(
        learner_level="Grade 7",
        overall_mastery=0.65,
        recent_performance_summary="Developing progress.",
        learning_preferences={"step_by_step": True, "visual_explanations": True},
        accessibility_preferences={
            "high_contrast": True,
            "large_text": True,
            "text_to_speech": True,
            "reduced_visual_complexity": True,
        },
        recommended_difficulty="developing",
    )

    adapted_content = ContentAdaptationResult(
        title="Visual Fractions Addition",
        adapted_explanation="Add numerators when denominators are the same.",
        key_concepts=["Like Denominators", "Numerator Addition"],
        worked_examples=[
            WorkedExample(
                title="Example: 1/4 + 2/4",
                problem="Compute 1/4 + 2/4",
                solution_steps=["Check denominators: both 4", "Add numerators: 1+2=3", "Result: 3/4"],
                explanation="Denominators remain unchanged.",
            )
        ],
        scaffolding_steps=["Step 1: Check denominator", "Step 2: Add numerators"],
        complexity_level="developing",
        adaptation_rationale="Tailored for developing learner.",
    )

    mock_provider = RecordingMockProvider()
    agent = AccessibilityAgent(llm_provider=mock_provider)

    result = await agent.adapt_accessibility(
        learner_context=learner_context,
        adapted_content=adapted_content,
    )

    assert isinstance(result, AccessibilityAdaptationResult)
    assert result.accessible_content is not None
    assert len(result.content_structure) > 0
    assert result.recommended_presentation["high_contrast_theme"] is True
    assert result.recommended_presentation["large_text_font"] is True
    assert "Visual Fractions Addition" in result.plain_language_summary or "Visual Fractions Addition" in result.accessible_content

    # Privacy verification: Prompt contains NO PII
    assert len(mock_provider.recorded_prompts) == 1
    prompt_str = mock_provider.recorded_prompts[0]
    assert "Visual Fractions Addition" in prompt_str
    assert "secret" not in prompt_str.lower()
    assert "email" not in prompt_str.lower()


@pytest.mark.asyncio
async def test_accessibility_agent_deterministic_fallback():
    """Test deterministic fallback when LLM provider fails."""
    learner_context = LearnerContextFrame(
        learner_level="Grade 8",
        overall_mastery=0.75,
        recent_performance_summary="Good mastery.",
        accessibility_preferences={"high_contrast": True, "text_to_speech": True},
        learning_preferences={"step_by_step": True},
        recommended_difficulty="proficient",
    )

    adapted_content = ContentAdaptationResult(
        title="Pythagorean Theorem",
        adapted_explanation="In a right triangle, a^2 + b^2 = c^2.",
        key_concepts=["Hypotenuse", "Right Triangle Legs"],
        scaffolding_steps=["Identify legs a and b", "Square legs", "Take square root of sum"],
        complexity_level="proficient",
        adaptation_rationale="Rationale.",
    )

    failing_provider = FailingMockProvider()
    agent = AccessibilityAgent(llm_provider=failing_provider)

    result = await agent.adapt_accessibility(
        learner_context=learner_context,
        adapted_content=adapted_content,
    )

    assert isinstance(result, AccessibilityAdaptationResult)
    assert "# Pythagorean Theorem" in result.accessible_content
    assert "## Overview" in result.accessible_content
    assert "## Key Concepts" in result.accessible_content
    assert "## Step-by-Step Learning Guide" in result.accessible_content
    assert result.recommended_presentation["high_contrast_theme"] is True
    assert result.recommended_presentation["text_to_speech_compatible"] is True


@pytest.mark.asyncio
async def test_accessibility_agent_custom_mock_response():
    """Test custom structured response validation."""
    custom_result = AccessibilityAdaptationResult(
        accessible_content="# Accessible Unit\n\nStructured text for screen readers.",
        plain_language_summary="Clear explanation of the concept.",
        content_structure=["Title", "Summary", "Steps"],
        recommended_presentation={"high_contrast": True},
        accessibility_rationale="Custom rationale.",
    )

    mock_provider = MockLLMProvider()
    mock_provider.set_mock_response("AccessibilityAdaptationResult", custom_result)

    agent = AccessibilityAgent(llm_provider=mock_provider)
    learner_context = LearnerContextFrame(
        learner_level="Grade 6",
        overall_mastery=0.50,
        recent_performance_summary="Summary",
        recommended_difficulty="beginner",
    )

    result = await agent.adapt_accessibility(
        learner_context=learner_context,
        raw_content="Simple arithmetic lesson.",
        title="Basic Addition",
    )

    assert result.plain_language_summary == "Clear explanation of the concept."
    assert "Structured text for screen readers" in result.accessible_content


@pytest.mark.asyncio
async def test_accessibility_agent_no_clinical_diagnoses():
    """Verify safety: Accessibility adaptations must not generate clinical or deficit labels."""
    learner_context = LearnerContextFrame(
        learner_level="Grade 5",
        overall_mastery=0.40,
        recent_performance_summary="Needs reinforcement.",
        accessibility_preferences={"reduced_visual_complexity": True, "large_text": True},
        recommended_difficulty="beginner",
    )

    agent = AccessibilityAgent(llm_provider=MockLLMProvider())
    result = await agent.adapt_accessibility(
        learner_context=learner_context,
        raw_content="Introduction to fractions.",
        title="Fractions Basics",
    )

    serialized = json.dumps(result.model_dump()).lower()
    for forbidden in ["autism", "adhd", "disorder", "deficit", "disabled", "impairment", "syndrome"]:
        assert forbidden not in serialized
