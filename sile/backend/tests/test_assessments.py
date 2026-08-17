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

    # Seed assessment questions
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
async def test_assessment_flow(app_with_db):
    transport = ASGITransport(app=app_with_db)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register learner
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "assessment_tester@sile.org",
                "password": "StrongPassword123",
                "full_name": "Taylor Swift",
            },
        )
        assert reg_res.status_code == 201
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. GET /api/v1/assessments
        list_res = await client.get("/api/v1/assessments", headers=headers)
        assert list_res.status_code == 200
        assessments = list_res.json()
        assert len(assessments) >= 1
        math_assessment = assessments[0]
        assessment_id = math_assessment["id"]
        assert math_assessment["subject"] == "Mathematics"
        assert math_assessment["total_questions"] == 10

        # 3. GET /api/v1/assessments/{id}
        detail_res = await client.get(f"/api/v1/assessments/{assessment_id}", headers=headers)
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        questions = detail_data["questions"]
        assert len(questions) == 10
        # Verify correct_answer is NOT exposed in public question detail
        for q in questions:
            assert "correct_answer" not in q
            assert len(q["options"]) == 4

        # 4. Submit 8 correct answers and 2 incorrect answers
        # Correct keys based on seed:
        # Q1: B, Q2: A, Q3: B, Q4: A, Q5: B, Q6: C, Q7: C, Q8: C, Q9: B, Q10: C
        answers_payload = [
            {"question_id": questions[0]["id"], "selected_answer": "B"}, # Correct
            {"question_id": questions[1]["id"], "selected_answer": "A"}, # Correct
            {"question_id": questions[2]["id"], "selected_answer": "B"}, # Correct
            {"question_id": questions[3]["id"], "selected_answer": "A"}, # Correct
            {"question_id": questions[4]["id"], "selected_answer": "B"}, # Correct
            {"question_id": questions[5]["id"], "selected_answer": "C"}, # Correct
            {"question_id": questions[6]["id"], "selected_answer": "C"}, # Correct
            {"question_id": questions[7]["id"], "selected_answer": "C"}, # Correct
            {"question_id": questions[8]["id"], "selected_answer": "A"}, # Incorrect (Correct is B)
            {"question_id": questions[9]["id"], "selected_answer": "A"}, # Incorrect (Correct is C)
        ]

        attempt_res = await client.post(
            f"/api/v1/assessments/{assessment_id}/attempt",
            json={"answers": answers_payload},
            headers=headers,
        )
        assert attempt_res.status_code == 201
        result = attempt_res.json()

        assert result["score"] == 8.0
        assert result["total_questions"] == 10
        assert result["percentage"] == 80.0
        assert result["learning_level"] == "Proficient"
        assert result["correct_count"] == 8
        assert result["incorrect_count"] == 2
        assert len(result["answers_summary"]) == 10
