import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.models.profile import LearnerProfile
from app.models.assessment import Assessment, AssessmentAttempt
from app.schemas.dashboard import (
    DashboardOverviewResponse,
    DashboardProfileSummary,
    DashboardLearningPreferencesSummary,
    DashboardAccessibilityPreferencesSummary,
    AssessmentHistoryItem,
)
from app.services.profile_service import ProfileService


class DashboardService:
    @staticmethod
    def calculate_profile_completion(profile: LearnerProfile) -> int:
        """
        Calculates profile completion percentage based on filled profile attributes.
        """
        score = 0
        # Basic fields
        if profile.full_name and len(profile.full_name.strip()) >= 2:
            score += 25
        if profile.age is not None and profile.age > 0:
            score += 15
        if profile.grade and len(profile.grade.strip()) > 0:
            score += 15
        if profile.preferred_language:
            score += 10
        if profile.learning_pace:
            score += 10
        if profile.preferred_content_type:
            score += 10
        if profile.learning_preference:
            score += 10
        if profile.accessibility_preference:
            score += 5

        return min(score, 100)

    @classmethod
    async def get_dashboard_overview(
        cls, db: AsyncSession, user: User
    ) -> DashboardOverviewResponse:
        # 1. Ensure profile exists and load with relationships
        profile = await ProfileService.get_or_create_profile(db, user.id)

        # 2. Calculate profile completion percentage
        completion_pct = cls.calculate_profile_completion(profile)

        # 3. Retrieve assessment attempts history
        stmt = (
            select(AssessmentAttempt)
            .options(selectinload(AssessmentAttempt.assessment))
            .where(AssessmentAttempt.learner_profile_id == profile.id)
            .order_by(AssessmentAttempt.completed_at.desc())
        )
        result = await db.execute(stmt)
        attempts = list(result.scalars().all())

        history_items: List[AssessmentHistoryItem] = []
        for att in attempts:
            history_items.append(
                AssessmentHistoryItem(
                    attempt_id=att.id,
                    assessment_id=att.assessment_id,
                    assessment_title=att.assessment.title if att.assessment else "Baseline Diagnostic",
                    subject=att.assessment.subject if att.assessment else "Mathematics",
                    score=att.score,
                    total_questions=att.assessment.total_questions if att.assessment else 10,
                    percentage=att.percentage,
                    learning_level=att.learning_level,
                    completed_at=att.completed_at or att.started_at,
                )
            )

        latest_assessment = history_items[0] if history_items else None
        baseline_status = "completed" if latest_assessment else "not_started"

        # 4. Find active baseline assessment ID (if exists)
        assess_stmt = select(Assessment).order_by(Assessment.created_at.desc())
        assess_res = await db.execute(assess_stmt)
        active_assessment = assess_res.scalars().first()
        active_assessment_id = active_assessment.id if active_assessment else None

        # 5. Extract preference summaries
        lp = profile.learning_preference
        learning_summary = DashboardLearningPreferencesSummary(
            visual_explanations=lp.visual_explanations if lp else True,
            step_by_step=lp.step_by_step if lp else True,
            simplified_language=lp.simplified_language if lp else False,
            audio_support=lp.audio_support if lp else False,
            interactive_learning=lp.interactive_learning if lp else True,
            short_sessions=lp.short_sessions if lp else False,
        )

        ap = profile.accessibility_preference
        a11y_summary = DashboardAccessibilityPreferencesSummary(
            large_text=ap.large_text if ap else False,
            high_contrast=ap.high_contrast if ap else False,
            text_to_speech=ap.text_to_speech if ap else False,
            reduced_visual_complexity=ap.reduced_visual_complexity if ap else False,
            keyboard_navigation=ap.keyboard_navigation if ap else False,
        )

        profile_summary = DashboardProfileSummary(
            full_name=profile.full_name,
            age=profile.age,
            grade=profile.grade,
            preferred_language=profile.preferred_language,
            learning_pace=profile.learning_pace,
            preferred_content_type=profile.preferred_content_type,
        )

        return DashboardOverviewResponse(
            user_id=user.id,
            email=user.email,
            full_name=profile.full_name,
            profile_completion_percentage=completion_pct,
            profile=profile_summary,
            learning_preferences=learning_summary,
            accessibility_preferences=a11y_summary,
            baseline_status=baseline_status,
            latest_assessment=latest_assessment,
            assessment_history=history_items,
            active_assessment_id=active_assessment_id,
        )
