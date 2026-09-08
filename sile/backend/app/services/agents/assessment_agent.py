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
from app.models.practice import PracticeQuestion
from app.schemas.agents import (
    AssessmentAgentOutput,
    AssessmentQuestionResult,
    ContentAdaptationResult,
    LearnerContextFrame,
)
from app.services.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)

ASSESSMENT_SYSTEM_PROMPT = """You are an expert Educational Assessment AI agent in the Smart Inclusive Learning Ecosystem (SILE).
Your role is to generate short, formative, conceptual assessment questions based strictly on authoritative curriculum content and learner evidence.

CRITICAL INSTRUCTIONS & SAFETY GUIDELINES:
1. The provided curriculum content and topic are the AUTHORITATIVE source. You must assess concepts strictly from the supplied lesson.
2. NEVER invent unrelated curriculum, question topics, or unsupported facts.
3. Formulate 2 to 5 conceptual multiple-choice questions matching the learner's recommended difficulty.
4. Distractors must represent plausible, diagnostic misconceptions (e.g. common arithmetic inversion errors, misapplying rules) rather than arbitrary noise.
5. Provide clear, supportive explanations for why the correct answer is correct, and rationales for why each distractor is incorrect.
6. Target demonstrated learning gaps and prerequisite challenges from the learner context frame.
7. NEVER diagnose medical, psychiatric, or cognitive conditions (do NOT use terms like 'disorder', 'disabled', 'deficit', 'impairment', 'adhd').
8. Return a valid JSON response strictly conforming to the AssessmentAgentOutput schema.
"""


class AssessmentAgent(BaseAgent):
    """
    Specialized Assessment Agent.
    Generates formative, diagnostic assessment questions with misconception-aware distractors
    grounded in Phase 2 curriculum and LearnerContextFrame evidence.
    """

    def __init__(self, llm_provider: Optional[BaseLLMProvider] = None):
        super().__init__(
            name=AgentName.ASSESSMENT,
            system_prompt=ASSESSMENT_SYSTEM_PROMPT,
            llm_provider=llm_provider,
        )

    async def generate_assessment(
        self,
        db: AsyncSession,
        learner_context: LearnerContextFrame,
        content_id: Optional[uuid.UUID] = None,
        topic_id: Optional[uuid.UUID] = None,
        adapted_content: Optional[ContentAdaptationResult] = None,
    ) -> List[AssessmentQuestionResult]:
        """
        Generate formative diagnostic assessment questions grounded in curriculum.
        Falls back to deterministic questions on LLM failure or unavailability.
        """
        # 1. Resolve Curriculum Context
        source_content, topic = await self._resolve_curriculum_context(
            db=db,
            content_id=content_id,
            topic_id=topic_id,
            learner_context=learner_context,
        )

        topic_name = topic.name if topic else (source_content.topic.name if source_content and source_content.topic else "Mathematics Concept")
        lesson_title = adapted_content.title if adapted_content else (source_content.title if source_content else topic_name)
        lesson_body = adapted_content.adapted_explanation if adapted_content else (source_content.content_body if source_content else "")
        key_concepts = adapted_content.key_concepts if adapted_content and adapted_content.key_concepts else [lesson_title, topic_name]

        # 2. Build Deterministic Fallback Questions (using existing PracticeQuestions if present)
        fallback_questions = await self._build_deterministic_fallback_questions(
            db=db,
            topic=topic,
            topic_name=topic_name,
            lesson_title=lesson_title,
            learner_context=learner_context,
        )

        # 3. Construct Sanitized, Privacy-Safe Prompt Payload (NO PII)
        prompt_payload = {
            "curriculum_context": {
                "topic": topic_name,
                "lesson_title": lesson_title,
                "key_concepts": key_concepts,
                "lesson_summary": lesson_body[:1000] if lesson_body else f"Study of {topic_name}",
            },
            "learner_profile": {
                "learner_level": learner_context.learner_level,
                "recommended_difficulty": learner_context.recommended_difficulty,
                "overall_mastery": learner_context.overall_mastery,
                "weak_topics": learner_context.weak_topics,
                "learning_gaps": learner_context.evidence_based_learning_gaps,
                "prerequisite_blockers": learner_context.prerequisite_blockers,
            }
        }

        # 4. Attempt Structured LLM Generation with Fallback Protection
        try:
            llm_result = await self.execute_structured(
                user_prompt=json.dumps(prompt_payload, indent=2),
                response_schema=AssessmentAgentOutput,
            )
            if not llm_result.questions:
                return fallback_questions
            
            # Sanitize and ensure fields are valid
            for q in llm_result.questions:
                if not q.difficulty:
                    q.difficulty = learner_context.recommended_difficulty
                if not q.options and fallback_questions:
                    q.options = fallback_questions[0].options
                if not q.correct_answer and fallback_questions:
                    q.correct_answer = fallback_questions[0].correct_answer

            return llm_result.questions
        except Exception as e:
            logger.warning(
                f"AssessmentAgent LLM execution failed or returned invalid response: {str(e)}. "
                "Returning deterministic formative assessment questions fallback."
            )
            return fallback_questions

    async def _resolve_curriculum_context(
        self,
        db: AsyncSession,
        content_id: Optional[uuid.UUID],
        topic_id: Optional[uuid.UUID],
        learner_context: LearnerContextFrame,
    ):
        """Resolve LearningContent and Topic from database."""
        source_content: Optional[LearningContent] = None
        topic: Optional[Topic] = None

        if content_id:
            c_stmt = (
                select(LearningContent)
                .options(selectinload(LearningContent.topic))
                .where(LearningContent.id == content_id)
            )
            c_res = await db.execute(c_stmt)
            source_content = c_res.scalar_one_or_none()
            if source_content:
                topic = source_content.topic

        if not topic and topic_id:
            t_stmt = select(Topic).where(Topic.id == topic_id)
            t_res = await db.execute(t_stmt)
            topic = t_res.scalar_one_or_none()

        if not topic and learner_context.weak_topics:
            t_stmt = select(Topic).where(Topic.name.in_(learner_context.weak_topics))
            t_res = await db.execute(t_stmt)
            topic = t_res.scalars().first()

        if not topic:
            any_t_stmt = select(Topic).limit(1)
            any_t_res = await db.execute(any_t_stmt)
            topic = any_t_res.scalars().first()

        if not source_content and topic:
            c_stmt = select(LearningContent).where(LearningContent.topic_id == topic.id).limit(1)
            c_res = await db.execute(c_stmt)
            source_content = c_res.scalars().first()

        return source_content, topic

    async def _build_deterministic_fallback_questions(
        self,
        db: AsyncSession,
        topic: Optional[Topic],
        topic_name: str,
        lesson_title: str,
        learner_context: LearnerContextFrame,
    ) -> List[AssessmentQuestionResult]:
        """Construct high-quality deterministic formative questions."""
        diff = learner_context.recommended_difficulty or "developing"

        # 1. Check if existing PracticeQuestions are stored in the database for this topic
        if topic:
            pq_stmt = (
                select(PracticeQuestion)
                .where(PracticeQuestion.topic_id == topic.id)
                .limit(3)
            )
            pq_res = await db.execute(pq_stmt)
            practice_qs = list(pq_res.scalars().all())
            if practice_qs:
                results = []
                for pq in practice_qs:
                    opts = pq.options
                    if isinstance(opts, dict):
                        options_list = [f"{k}: {v}" for k, v in opts.items()]
                    elif isinstance(opts, list):
                        options_list = [str(o) for o in opts]
                    else:
                        options_list = ["Option A", "Option B", "Option C", "Option D"]

                    results.append(
                        AssessmentQuestionResult(
                            question=pq.question_text,
                            question_type="multiple_choice",
                            options=options_list,
                            correct_answer=pq.correct_answer,
                            explanation=pq.explanation or f"Correct answer verified for {topic_name}.",
                            difficulty=pq.difficulty.value if hasattr(pq.difficulty, "value") else diff,
                            targeted_learning_gap=f"Formative check on {topic_name}.",
                            distractor_rationales={
                                "Common Distractor": "Represents misinterpreting component steps."
                            },
                        )
                    )
                return results

        # 2. Deterministic synthesis based on topic concept
        return [
            AssessmentQuestionResult(
                question=f"Which statement correctly describes the foundational rule for {topic_name}?",
                question_type="multiple_choice",
                options=[
                    f"A) Apply the standard rule for {topic_name} step by step.",
                    f"B) Invert the operation without checking component terms.",
                    f"C) Ignore the denominator or base during calculation.",
                    f"D) Combine unlike terms directly without simplification.",
                ],
                correct_answer=f"A) Apply the standard rule for {topic_name} step by step.",
                explanation=f"Applying the systematic rule for {topic_name} ensures mathematical accuracy.",
                difficulty=diff,
                targeted_learning_gap=f"Conceptual comprehension of {topic_name}.",
                distractor_rationales={
                    f"B) Invert the operation without checking component terms.": "Common misconception of inverting terms prematurely.",
                    f"C) Ignore the denominator or base during calculation.": "Error arising from neglecting denominator constraints.",
                    f"D) Combine unlike terms directly without simplification.": "Misconception regarding direct addition of unequal parts.",
                },
            ),
            AssessmentQuestionResult(
                question=f"When solving a problem in {lesson_title}, what is the critical first step?",
                question_type="multiple_choice",
                options=[
                    "A) Identify the given terms and state the appropriate operation.",
                    "B) Guess the answer from the first numbers given.",
                    "C) Skip definitions and multiply all numbers together.",
                    "D) Change the numbers to make arithmetic easier.",
                ],
                correct_answer="A) Identify the given terms and state the appropriate operation.",
                explanation="Identifying the given terms and mathematical conditions is the essential first step.",
                difficulty=diff,
                targeted_learning_gap=f"Problem analysis in {lesson_title}.",
                distractor_rationales={
                    "B) Guess the answer from the first numbers given.": "Impulsive guessing without conceptual analysis.",
                    "C) Skip definitions and multiply all numbers together.": "Blind application of multiplication without considering the objective.",
                },
            ),
        ]
