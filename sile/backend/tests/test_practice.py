import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.db.seeds.demo_seed import seed_all_demo_data


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

    yield app

    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.mark.asyncio
async def test_adaptive_practice_full_flow(app_with_demo_db):
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

        # 2. Get Topics list
        topics_res = await client.get("/api/v1/topics", headers=headers)
        assert topics_res.status_code == 200
        topics = topics_res.json()
        assert len(topics) >= 5
        fractions_topic = next(t for t in topics if t["code"] == "MATH_FRAC")
        topic_id = fractions_topic["id"]

        # 3. Generate calibrated practice session for Fractions
        gen_res = await client.post(
            "/api/v1/practice/generate",
            json={"topic_id": topic_id, "num_questions": 4},
            headers=headers,
        )
        assert gen_res.status_code == 200
        gen_data = gen_res.json()
        assert gen_data["topic_id"] == topic_id
        assert gen_data["topic_name"] == "Fractions"
        assert len(gen_data["questions"]) > 0

        questions = gen_data["questions"]
        first_q = questions[0]
        assert "options" in first_q
        assert "question_text" in first_q
        assert "correct_answer" not in first_q  # Ensure correct answer is hidden

        # 4. Submit practice answers
        # Pick 'A' for first question, 'B' for remainder
        sub_answers = [
            {"question_id": q["id"], "selected_answer": "A" if idx == 0 else "B"}
            for idx, q in enumerate(questions)
        ]

        sub_res = await client.post(
            "/api/v1/practice/submit",
            json={
                "topic_id": topic_id,
                "answers": sub_answers,
            },
            headers=headers,
        )
        assert sub_res.status_code == 201
        sub_data = sub_res.json()

        # 5. Verify grading, mastery calculation, and explainability
        assert sub_data["topic_id"] == topic_id
        assert sub_data["total_questions"] == len(questions)
        assert "score" in sub_data
        assert "percentage" in sub_data
        assert "previous_mastery" in sub_data
        assert "updated_mastery" in sub_data
        assert "mastery_status" in sub_data
        assert "recommended_next_action" in sub_data
        assert len(sub_data["recommended_next_action"]) > 10
        assert "reviews" in sub_data
        assert len(sub_data["reviews"]) == len(questions)

        for review in sub_data["reviews"]:
            assert "is_correct" in review
            assert "correct_answer" in review
            assert "explanation" in review
