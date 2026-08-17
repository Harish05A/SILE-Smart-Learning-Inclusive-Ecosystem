import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.db.seeds.assessment_seed import seed_math_assessment


@pytest.fixture
async def app_with_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed assessment
    async with async_session() as session:
        await seed_math_assessment(session)

    async def override_get_db():
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    yield app

    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.mark.asyncio
async def test_dashboard_overview_flow(app_with_db):
    transport = ASGITransport(app=app_with_db)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register learner
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "dashboard_test@sile.org",
                "password": "StrongPassword123",
                "full_name": "Robin Sparkles",
            },
        )
        assert reg_res.status_code == 201
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. GET /api/v1/dashboard/overview - Initial state (No assessment taken yet)
        dash_res = await client.get("/api/v1/dashboard/overview", headers=headers)
        assert dash_res.status_code == 200
        dash_data = dash_res.json()

        assert dash_data["full_name"] == "Robin Sparkles"
        assert dash_data["email"] == "dashboard_test@sile.org"
        assert dash_data["profile_completion_percentage"] >= 50
        assert dash_data["baseline_status"] == "not_started"
        assert dash_data["latest_assessment"] is None
        assert len(dash_data["assessment_history"]) == 0
        assert dash_data["learning_preferences"]["step_by_step"] is True
        assert dash_data["active_assessment_id"] is not None

        # 3. Take Assessment
        assessment_id = dash_data["active_assessment_id"]
        detail_res = await client.get(f"/api/v1/assessments/{assessment_id}", headers=headers)
        questions = detail_res.json()["questions"]

        # Submit 9 answers
        answers_payload = [
            {"question_id": q["id"], "selected_answer": "B" if i % 2 == 0 else "C"}
            for i, q in enumerate(questions)
        ]
        attempt_res = await client.post(
            f"/api/v1/assessments/{assessment_id}/attempt",
            json={"answers": answers_payload},
            headers=headers,
        )
        assert attempt_res.status_code == 201

        # 4. GET /api/v1/dashboard/overview again - After taking assessment
        dash_res_after = await client.get("/api/v1/dashboard/overview", headers=headers)
        assert dash_res_after.status_code == 200
        after_data = dash_res_after.json()

        assert after_data["baseline_status"] == "completed"
        assert after_data["latest_assessment"] is not None
        assert after_data["latest_assessment"]["score"] > 0
        assert len(after_data["assessment_history"]) == 1
