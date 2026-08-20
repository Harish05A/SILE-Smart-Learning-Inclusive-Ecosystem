import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.curriculum import ContentDifficulty
from app.models.adaptive import RecommendationPriority
from app.db.seeds.demo_seed import seed_all_demo_data


@pytest.fixture
async def app_with_demo_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed demo user, baseline assessment, and curriculum
    async with session_factory() as session:
        await seed_all_demo_data(session)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    yield app

    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.mark.asyncio
async def test_recommendation_engine_full_flow(app_with_demo_db):
    transport = ASGITransport(app=app_with_demo_db)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as demo learner
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "demo.learner@sile.org", "password": "DemoPassword123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get baseline assessment
        assess_list = await client.get("/api/v1/assessments", headers=headers)
        assert assess_list.status_code == 200
        assessment_id = assess_list.json()[0]["id"]

        detail_res = await client.get(f"/api/v1/assessments/{assessment_id}", headers=headers)
        questions = detail_res.json()["questions"]

        # 3. Submit tailored answers:
        # Number System (Q1, Q2 correct) -> 100% (High)
        # Fractions (Q3 correct, Q4 wrong) -> 50% (Developing)
        # Percentages (Q5, Q6 correct) -> 100% (High)
        # Basic Algebra (Q7, Q8 wrong) -> 0% (Weak / Low)
        # Geometry (Q9, Q10 correct) -> 100% (High)
        answers = [
            {"question_id": questions[0]["id"], "selected_answer": "B"},
            {"question_id": questions[1]["id"], "selected_answer": "A"},
            {"question_id": questions[2]["id"], "selected_answer": "B"},
            {"question_id": questions[3]["id"], "selected_answer": "A"},  # Wrong
            {"question_id": questions[4]["id"], "selected_answer": "B"},
            {"question_id": questions[5]["id"], "selected_answer": "B"},
            {"question_id": questions[6]["id"], "selected_answer": "A"},  # Wrong
            {"question_id": questions[7]["id"], "selected_answer": "A"},  # Wrong
            {"question_id": questions[8]["id"], "selected_answer": "B"},
            {"question_id": questions[9]["id"], "selected_answer": "C"},
        ]

        attempt_res = await client.post(
            f"/api/v1/assessments/{assessment_id}/attempt",
            json={"answers": answers},
            headers=headers,
        )
        assert attempt_res.status_code == 201

        # 4. Call GET /api/v1/learners/me/recommendations
        rec_res = await client.get("/api/v1/learners/me/recommendations", headers=headers)
        assert rec_res.status_code == 200
        rec_data = rec_res.json()

        assert rec_data["total_recommendations"] >= 1
        recommendations = rec_data["recommendations"]

        # RULE 9: Weak topic (Basic Algebra) must be ranked #1
        first_rec = recommendations[0]
        assert first_rec["topic_code"] == "MATH_ALG"
        assert first_rec["difficulty"] == "beginner"
        assert first_rec["priority"] in ["urgent", "high"]
        assert "Basic Algebra" in first_rec["reason"]
        assert "0%" in first_rec["reason"]

        # RULE 2: Developing topic (Fractions) must be ranked #2
        second_rec = recommendations[1]
        assert second_rec["topic_code"] == "MATH_FRAC"
        assert second_rec["difficulty"] == "developing"
        assert second_rec["priority"] == "high"
        assert "Fractions" in second_rec["reason"]
        assert "50%" in second_rec["reason"]

        # Check that reasons are transparent, human-readable explanations
        for rec in recommendations:
            assert len(rec["reason"]) > 15
            assert rec["content_title"] is not None
            assert rec["estimated_duration_minutes"] > 0

        # 5. Verify alias GET /api/v1/learner/recommendations
        alias_res = await client.get("/api/v1/learner/recommendations", headers=headers)
        assert alias_res.status_code == 200
        assert alias_res.json()["recommendations"][0]["topic_code"] == "MATH_ALG"
