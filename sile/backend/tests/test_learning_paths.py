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
async def test_learning_paths_full_lifecycle(app_with_demo_db):
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

        # 2. Complete baseline assessment (Fractions 50%, Algebra 0% -> Weak)
        assess_list = await client.get("/api/v1/assessments", headers=headers)
        assessment_id = assess_list.json()[0]["id"]
        detail_res = await client.get(f"/api/v1/assessments/{assessment_id}", headers=headers)
        questions = detail_res.json()["questions"]

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
        await client.post(
            f"/api/v1/assessments/{assessment_id}/attempt",
            json={"answers": answers},
            headers=headers,
        )

        # 3. POST /api/v1/learners/me/learning-paths/generate
        gen_res = await client.post(
            "/api/v1/learners/me/learning-paths/generate",
            json={"max_items": 8},
            headers=headers,
        )
        assert gen_res.status_code == 201
        path_data = gen_res.json()

        assert path_data["title"] == "Personalized Mathematics Mastery Path"
        assert path_data["status"] == "in_progress"
        assert 5 <= path_data["total_items"] <= 10
        assert path_data["completed_items"] == 0
        assert path_data["progress_percentage"] == 0.0
        assert path_data["total_estimated_duration_minutes"] > 0

        items = path_data["items"]
        assert len(items) >= 5

        # Check sequence numbers (1, 2, 3...)
        for i, item in enumerate(items, start=1):
            assert item["sequence_number"] == i

        # Item 1 is in_progress, item 2 is pending
        assert items[0]["status"] == "in_progress"
        assert items[1]["status"] == "pending"

        path_id = path_data["id"]
        first_item_id = items[0]["id"]
        second_item_id = items[1]["id"]

        # 4. GET /api/v1/learners/me/learning-paths
        list_res = await client.get("/api/v1/learners/me/learning-paths", headers=headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1

        # 5. GET /api/v1/learners/me/learning-paths/{path_id}
        single_res = await client.get(f"/api/v1/learners/me/learning-paths/{path_id}", headers=headers)
        assert single_res.status_code == 200
        assert single_res.json()["id"] == path_id

        # 6. PATCH /api/v1/learners/me/learning-paths/{path_id}/items/{item_id} -> Complete item 1
        patch_res = await client.patch(
            f"/api/v1/learners/me/learning-paths/{path_id}/items/{first_item_id}",
            json={"status": "completed"},
            headers=headers,
        )
        assert patch_res.status_code == 200
        updated_path = patch_res.json()

        assert updated_path["completed_items"] == 1
        assert updated_path["progress_percentage"] > 0.0

        # Verify item 1 is completed and item 2 automatically advanced to in_progress
        updated_items = updated_path["items"]
        assert updated_items[0]["status"] == "completed"
        assert updated_items[0]["completed_at"] is not None
        assert updated_items[1]["status"] == "in_progress"

        # 7. Complete all remaining items to verify overall path completion
        for item in updated_items[1:]:
            await client.patch(
                f"/api/v1/learners/me/learning-paths/{path_id}/items/{item['id']}",
                json={"status": "completed"},
                headers=headers,
            )

        final_res = await client.get(f"/api/v1/learners/me/learning-paths/{path_id}", headers=headers)
        assert final_res.status_code == 200
        final_path = final_res.json()
        assert final_path["status"] == "completed"
        assert final_path["completed_items"] == final_path["total_items"]
        assert final_path["progress_percentage"] == 100.0
