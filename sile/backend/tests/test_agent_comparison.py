import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.exceptions import EntityNotFoundException, ValidationException
from app.core.llm.mock_provider import MockLLMProvider
from app.db.base import Base
from app.db.seeds.demo_seed import seed_all_demo_data
from app.db.session import get_db
from app.main import app
from app.models.agents import (
    AgentComparisonEvaluation,
    AgentSession,
    SessionType,
)
from app.models.curriculum import Topic
from app.models.profile import LearnerProfile
from app.models.user import User
from app.services.agent_comparison import AgentComparisonService
from app.services.agents.coordinator_agent import CoordinatorAgent


@pytest.fixture
async def app_with_demo_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed demo user, baseline assessment, curriculum, and practice questions
    async with session_factory() as session:
        await seed_all_demo_data(session)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    yield app, session_factory

    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.mark.asyncio
async def test_deterministic_baseline_and_multi_agent_comparison_service(app_with_demo_db):
    """Test 1, 2, 3, 5, 8: Baseline generation, multi-agent output extraction, comparison creation, and persistence."""
    _, session_factory = app_with_demo_db

    async with session_factory() as session:
        # Get demo user profile and topic
        profile_res = await session.execute(select(LearnerProfile))
        profile = profile_res.scalars().first()
        assert profile is not None

        topic_res = await session.execute(select(Topic).where(Topic.code == "MATH_FRAC"))
        topic = topic_res.scalars().first()
        assert topic is not None

        # Run Coordinator to produce multi-agent session
        coordinator = CoordinatorAgent(llm_provider=MockLLMProvider())
        coord_res = await coordinator.coordinate(
            db=session,
            learner_profile_id=profile.id,
            session_type=SessionType.LESSON_ADAPTATION,
            topic_id=topic.id,
        )

        agent_session = await session.get(AgentSession, coord_res.session_id)
        assert agent_session is not None

        # 1. Deterministic baseline generation
        baseline = await AgentComparisonService.generate_deterministic_baseline(
            db=session,
            learner_profile_id=profile.id,
            session=agent_session,
        )
        assert baseline["approach"] == "rule_based_deterministic_baseline"
        assert baseline["topic_name"] == topic.name
        assert baseline["has_scaffolded_worked_examples"] is False

        # 2. Multi-agent result retrieval
        ma_output = await AgentComparisonService.get_multi_agent_output(
            db=session,
            session=agent_session,
        )
        assert ma_output["approach"] == "multi_agent_intelligence"
        assert ma_output["session_id"] == str(agent_session.id)
        assert ma_output["adapted_content"] is not None

        # 3. Create comparison evaluation
        eval_record = await AgentComparisonService.create_or_update_evaluation(
            db=session,
            session_id=coord_res.session_id,
            learner_profile_id=profile.id,
            learner_rating=4,
            notes="Evaluated multi-agent adaptation against curriculum baseline.",
        )

        assert eval_record.id is not None
        assert eval_record.learner_rating == 4
        assert eval_record.session_id == coord_res.session_id

        # 4. Check comparison dimensions (no fake metrics)
        dimensions = eval_record.rule_based_output["evaluation_dimensions"]
        assert "relevance" in dimensions
        assert "personalization" in dimensions
        assert "accessibility" in dimensions
        assert "pedagogical_usefulness" in dimensions
        assert "learning_gap_alignment" in dimensions
        assert "response_completeness" in dimensions
        assert "learner_preference_alignment" in dimensions

        metrics = eval_record.rule_based_output["evaluation_metrics"]
        assert isinstance(metrics["multi_agent_worked_examples_count"], int)

        # 5. Retrieve via get_evaluation
        retrieved = await AgentComparisonService.get_evaluation(
            db=session,
            session_id=coord_res.session_id,
            learner_profile_id=profile.id,
        )
        assert retrieved.id == eval_record.id


@pytest.mark.asyncio
async def test_learner_rating_validation_bounds(app_with_demo_db):
    """Test 4: Enforces learner rating range 1..5."""
    _, session_factory = app_with_demo_db

    async with session_factory() as session:
        profile_res = await session.execute(select(LearnerProfile))
        profile = profile_res.scalars().first()
        topic_res = await session.execute(select(Topic))
        topic = topic_res.scalars().first()

        coordinator = CoordinatorAgent(llm_provider=MockLLMProvider())
        coord_res = await coordinator.coordinate(
            db=session,
            learner_profile_id=profile.id,
            session_type=SessionType.LESSON_ADAPTATION,
            topic_id=topic.id,
        )

        # Invalid rating 0
        with pytest.raises(ValidationException):
            await AgentComparisonService.create_or_update_evaluation(
                db=session,
                session_id=coord_res.session_id,
                learner_profile_id=profile.id,
                learner_rating=0,
            )

        # Invalid rating 6
        with pytest.raises(ValidationException):
            await AgentComparisonService.create_or_update_evaluation(
                db=session,
                session_id=coord_res.session_id,
                learner_profile_id=profile.id,
                learner_rating=6,
            )


@pytest.mark.asyncio
async def test_missing_session_and_access_control(app_with_demo_db):
    """Test 6 & 9: Non-existent session 404 and cross-learner access protection."""
    _, session_factory = app_with_demo_db

    async with session_factory() as session:
        profile_res = await session.execute(select(LearnerProfile))
        profile = profile_res.scalars().first()

        # Nonexistent session
        with pytest.raises(EntityNotFoundException):
            await AgentComparisonService.create_or_update_evaluation(
                db=session,
                session_id=uuid.uuid4(),
                learner_profile_id=profile.id,
                learner_rating=4,
            )

        # Create another user & profile
        other_user = User(
            email=f"other_{uuid.uuid4().hex[:6]}@sile.org",
            password_hash="hashed_pw_test",
        )
        session.add(other_user)
        await session.commit()
        await session.refresh(other_user)

        other_profile = LearnerProfile(user_id=other_user.id, full_name="Other Learner")
        session.add(other_profile)
        await session.commit()
        await session.refresh(other_profile)

        # Create session for first profile
        topic_res = await session.execute(select(Topic))
        topic = topic_res.scalars().first()
        coordinator = CoordinatorAgent(llm_provider=MockLLMProvider())
        coord_res = await coordinator.coordinate(
            db=session,
            learner_profile_id=profile.id,
            session_type=SessionType.LESSON_ADAPTATION,
            topic_id=topic.id,
        )

        # Other profile trying to access first profile's session should fail
        with pytest.raises(EntityNotFoundException):
            await AgentComparisonService.create_or_update_evaluation(
                db=session,
                session_id=coord_res.session_id,
                learner_profile_id=other_profile.id,
                learner_rating=5,
            )


@pytest.mark.asyncio
async def test_api_comparison_endpoints_flow(app_with_demo_db):
    """Test 10: Complete API lifecycle for POST /comparisons and GET /comparisons endpoints."""
    app_instance, _ = app_with_demo_db
    transport = ASGITransport(app=app_instance)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as demo user
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "demo.learner@sile.org", "password": "DemoPassword123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Coordinate an agent session
        topics_res = await client.get("/api/v1/topics", headers=headers)
        topic_id = topics_res.json()[0]["id"]

        coord_res = await client.post(
            "/api/v1/agents/coordinate",
            json={"session_type": "lesson_adaptation", "topic_id": topic_id},
            headers=headers,
        )
        assert coord_res.status_code == 200
        session_id = coord_res.json()["session_id"]

        # 3. Create / Record Comparison Evaluation via API
        post_eval_res = await client.post(
            "/api/v1/agents/comparisons",
            json={
                "session_id": session_id,
                "learner_rating": 5,
                "notes": "Multi-agent worked examples provided clear scaffolding.",
            },
            headers=headers,
        )
        assert post_eval_res.status_code == 200
        eval_data = post_eval_res.json()
        assert eval_data["session_id"] == session_id
        assert eval_data["learner_rating"] == 5
        assert "rule_based_output" in eval_data
        assert "multi_agent_output" in eval_data

        # 4. Get specific comparison evaluation
        get_eval_res = await client.get(
            f"/api/v1/agents/comparisons/{session_id}",
            headers=headers,
        )
        assert get_eval_res.status_code == 200
        assert get_eval_res.json()["session_id"] == session_id

        # 5. List comparison evaluations
        list_eval_res = await client.get(
            "/api/v1/agents/comparisons?limit=10",
            headers=headers,
        )
        assert list_eval_res.status_code == 200
        evaluations_list = list_eval_res.json()
        assert isinstance(evaluations_list, list)
        assert len(evaluations_list) >= 1
        assert any(item["session_id"] == session_id for item in evaluations_list)
