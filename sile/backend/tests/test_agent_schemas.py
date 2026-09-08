import uuid
import pytest
from pydantic import ValidationError

from app.models.agents import (
    AgentName,
    InteractionStatus,
    SessionStatus,
    SessionType,
)
from app.schemas.agents import (
    AccessibilityAdaptationResult,
    AgentComparisonEvaluationCreate,
    AgentComparisonEvaluationResponse,
    AgentInteractionResult,
    AgentSessionCreate,
    AgentSessionResponse,
    AssessmentQuestionResult,
    ContentAdaptationResult,
    LearnerContextFrame,
    MultiAgentResponse,
    RuleBasedComparisonResult,
    WorkedExample,
)


def test_agent_session_create_valid_contexts():
    """Test that providing topic_id, content_id, or user_inquiry individually passes validation."""
    sample_uuid = uuid.uuid4()

    # 1. Topic ID only
    req1 = AgentSessionCreate(
        session_type=SessionType.LESSON_ADAPTATION,
        topic_id=sample_uuid,
    )
    assert req1.topic_id == sample_uuid
    assert req1.content_id is None
    assert req1.user_inquiry is None

    # 2. Content ID only
    req2 = AgentSessionCreate(
        session_type=SessionType.FORMATIVE_ASSESSMENT,
        content_id=sample_uuid,
    )
    assert req2.content_id == sample_uuid

    # 3. User inquiry only
    req3 = AgentSessionCreate(
        session_type=SessionType.INTERACTIVE_TUTORING,
        user_inquiry="Can you explain how to multiply decimals?",
    )
    assert req3.user_inquiry == "Can you explain how to multiply decimals?"


def test_agent_session_create_missing_all_contexts_fails():
    """Test that creating a session without any context raises a ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        AgentSessionCreate(
            session_type=SessionType.LESSON_ADAPTATION,
            topic_id=None,
            content_id=None,
            user_inquiry=None,
        )
    assert "at least one learning context must be provided" in str(exc_info.value).lower()

    # Empty whitespace string also fails
    with pytest.raises(ValidationError):
        AgentSessionCreate(
            session_type=SessionType.LESSON_ADAPTATION,
            user_inquiry="   ",
        )


def test_learner_context_frame_validation():
    """Test LearnerContextFrame accepts strictly evidence-based data."""
    frame = LearnerContextFrame(
        learner_level="Grade 7 - Developing",
        overall_mastery=0.62,
        weak_topics=["Fractions Division", "Decimals Comparison"],
        strong_topics=["Addition of Fractions"],
        recent_performance_summary="Recent practice score is 60% with errors concentrated in reciprocal inversion.",
        learning_preferences={"preferred_pace": "moderate", "format": "visual"},
        accessibility_preferences={"high_contrast": True, "font_size": "large"},
        recommended_difficulty="developing",
        evidence_based_learning_gaps=["Accuracy on division questions with unequal denominators is 35%."],
        prerequisite_blockers=["Mastery on Equivalent Fractions is below 40% threshold."],
        adaptation_parameters={"scaffolding_step_size": "small", "include_visual_pie": True},
    )

    assert frame.overall_mastery == 0.62
    assert len(frame.weak_topics) == 2
    assert len(frame.evidence_based_learning_gaps) == 1
    assert "Equivalent Fractions" in frame.prerequisite_blockers[0]


def test_learner_context_frame_mastery_bounds():
    """Test that mastery score must be between 0.0 and 1.0."""
    with pytest.raises(ValidationError):
        LearnerContextFrame(
            learner_level="Grade 7",
            overall_mastery=1.5,  # Out of bounds
            recent_performance_summary="Summary",
            recommended_difficulty="beginner",
        )

    with pytest.raises(ValidationError):
        LearnerContextFrame(
            learner_level="Grade 7",
            overall_mastery=-0.1,  # Out of bounds
            recent_performance_summary="Summary",
            recommended_difficulty="beginner",
        )


def test_content_adaptation_schema():
    """Test ContentAdaptationResult schema with worked examples."""
    adapted = ContentAdaptationResult(
        title="Visual Guide to Multiplying Fractions",
        adapted_explanation="Multiply numerators across, then multiply denominators across.",
        key_concepts=["Numerator multiplication", "Denominator multiplication", "Simplification"],
        worked_examples=[
            WorkedExample(
                title="Example 1: 1/2 x 2/3",
                problem="Compute (1/2) * (2/3)",
                solution_steps=["Multiply tops: 1*2 = 2", "Multiply bottoms: 2*3 = 6", "Simplify: 2/6 = 1/3"],
                explanation="1/3 is the final simplified fraction.",
            )
        ],
        scaffolding_steps=["Step 1: Check if simplification is possible", "Step 2: Multiply straight across"],
        complexity_level="developing",
        adaptation_rationale="Tailored for developing learner who benefits from step-by-step arithmetic decomposition.",
    )

    assert adapted.title == "Visual Guide to Multiplying Fractions"
    assert len(adapted.worked_examples) == 1
    assert adapted.worked_examples[0].solution_steps[0] == "Multiply tops: 1*2 = 2"


def test_assessment_question_result_schema():
    """Test AssessmentQuestionResult schema."""
    question = AssessmentQuestionResult(
        question="What is 3/4 divided by 1/2?",
        question_type="multiple_choice",
        options=["3/8", "6/4 (or 1 1/2)", "3/2 (or 1 1/2)", "1/4"],
        correct_answer="3/2 (or 1 1/2)",
        explanation="Dividing by 1/2 is equivalent to multiplying by 2: (3/4) * (2/1) = 6/4 = 3/2.",
        difficulty="developing",
        targeted_learning_gap="Inverting the divisor before multiplying",
        distractor_rationales={
            "3/8": "Learner multiplied denominators directly without taking the reciprocal."
        },
    )

    assert question.correct_answer == "3/2 (or 1 1/2)"
    assert "3/8" in question.distractor_rationales


def test_accessibility_adaptation_schema():
    """Test AccessibilityAdaptationResult schema."""
    access = AccessibilityAdaptationResult(
        accessible_content="# Fractions\n\n- Part 1: Top number is numerator\n- Part 2: Bottom number is denominator",
        plain_language_summary="A fraction shows parts of a whole item.",
        content_structure=["Introduction", "Numerator", "Denominator", "Summary"],
        recommended_presentation={"high_contrast": True, "screen_reader_order": "linear"},
        accessibility_rationale="Simplified visual structure with high readability formatting.",
    )

    assert access.plain_language_summary == "A fraction shows parts of a whole item."
    assert access.recommended_presentation["high_contrast"] is True


def test_multi_agent_response_full_and_partial():
    """Test MultiAgentResponse with full sub-agents and partial sub-agents."""
    session_id = uuid.uuid4()
    context = LearnerContextFrame(
        learner_level="Grade 7",
        overall_mastery=0.55,
        recent_performance_summary="Developing in fractions",
        recommended_difficulty="developing",
    )

    adapted = ContentAdaptationResult(
        title="Fractions Concept",
        adapted_explanation="Explanation text",
        complexity_level="developing",
        adaptation_rationale="Pace match",
    )

    access = AccessibilityAdaptationResult(
        accessible_content="Accessible text",
        plain_language_summary="Summary",
        accessibility_rationale="Readability",
    )

    # 1. Partial: assessment is None
    partial_resp = MultiAgentResponse(
        session_id=session_id,
        learner_context=context,
        adapted_content=adapted,
        assessment=None,
        accessibility_adaptation=access,
        agent_results=[
            AgentInteractionResult(
                agent_name=AgentName.COORDINATOR,
                status=InteractionStatus.COMPLETED,
                latency_ms=50,
            )
        ],
        execution_summary="Completed tutoring adaptation without formative assessment.",
    )

    assert partial_resp.assessment is None
    assert partial_resp.adapted_content is not None
    assert len(partial_resp.agent_results) == 1

    # 2. Full: all sub-agents present
    question = AssessmentQuestionResult(
        question="Check question",
        correct_answer="A",
        explanation="Explanation",
        difficulty="developing",
    )
    full_resp = MultiAgentResponse(
        session_id=session_id,
        learner_context=context,
        adapted_content=adapted,
        assessment=[question],
        accessibility_adaptation=access,
        execution_summary="All sub-agents completed.",
    )

    assert full_resp.assessment is not None
    assert len(full_resp.assessment) == 1


def test_comparison_evaluation_rating_validation():
    """Test validation on learner ratings (1-5 range)."""
    session_id = uuid.uuid4()

    # Valid ratings 1, 3, 5
    for valid_rating in [1, 3, 5]:
        eval_create = AgentComparisonEvaluationCreate(
            session_id=session_id,
            rule_based_output={"rec": "standard"},
            multi_agent_output={"rec": "adapted"},
            learner_rating=valid_rating,
        )
        assert eval_create.learner_rating == valid_rating

    # Invalid rating 0
    with pytest.raises(ValidationError):
        AgentComparisonEvaluationCreate(
            session_id=session_id,
            rule_based_output={},
            multi_agent_output={},
            learner_rating=0,
        )

    # Invalid rating 6
    with pytest.raises(ValidationError):
        AgentComparisonEvaluationCreate(
            session_id=session_id,
            rule_based_output={},
            multi_agent_output={},
            learner_rating=6,
        )
