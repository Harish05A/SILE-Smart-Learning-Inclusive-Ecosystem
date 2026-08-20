import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.db.seeds.curriculum_seed import seed_curriculum_and_content


@pytest.fixture
async def app_with_curriculum_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed curriculum data
    async with session_factory() as session:
        await seed_curriculum_and_content(session)

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
async def test_curriculum_and_content_endpoints(app_with_curriculum_db):
    transport = ASGITransport(app=app_with_curriculum_db)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register & authenticate learner
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "curriculum_learner@sile.org",
                "password": "ValidPassword123",
                "full_name": "Curriculum Tester",
            },
        )
        assert reg_res.status_code == 201
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. GET /api/v1/subjects
        sub_res = await client.get("/api/v1/subjects", headers=headers)
        assert sub_res.status_code == 200
        subjects = sub_res.json()
        assert len(subjects) >= 1
        math_subject = subjects[0]
        assert math_subject["code"] == "MATH"
        assert math_subject["name"] == "Mathematics"
        assert math_subject["topics_count"] == 5
        math_id = math_subject["id"]

        # 3. GET /api/v1/subjects/{subject_id}
        sub_detail_res = await client.get(f"/api/v1/subjects/{math_id}", headers=headers)
        assert sub_detail_res.status_code == 200
        sub_detail = sub_detail_res.json()
        assert len(sub_detail["topics"]) == 5
        assert sub_detail["topics"][0]["code"] == "MATH_NUM"
        assert sub_detail["topics"][1]["code"] == "MATH_FRAC"

        # 4. GET /api/v1/topics (with and without subject filter)
        all_topics_res = await client.get("/api/v1/topics", headers=headers)
        assert all_topics_res.status_code == 200
        assert len(all_topics_res.json()) == 5

        filtered_topics_res = await client.get(f"/api/v1/topics?subject_id={math_id}", headers=headers)
        assert filtered_topics_res.status_code == 200
        assert len(filtered_topics_res.json()) == 5
        fractions_topic = next(t for t in filtered_topics_res.json() if t["code"] == "MATH_FRAC")
        fractions_id = fractions_topic["id"]

        # 5. GET /api/v1/topics/{topic_id}
        topic_detail_res = await client.get(f"/api/v1/topics/{fractions_id}", headers=headers)
        assert topic_detail_res.status_code == 200
        topic_detail = topic_detail_res.json()
        assert topic_detail["code"] == "MATH_FRAC"
        assert len(topic_detail["skills"]) == 4
        assert topic_detail["contents_count"] == 4

        # 6. GET /api/v1/content (All content items)
        all_content_res = await client.get("/api/v1/content", headers=headers)
        assert all_content_res.status_code == 200
        all_content = all_content_res.json()
        assert len(all_content) == 20  # 4 contents per topic * 5 topics

        # 7. GET /api/v1/content with filters (Fractions topic + Proficient difficulty)
        filtered_content_res = await client.get(
            f"/api/v1/content?topic_id={fractions_id}&difficulty=proficient",
            headers=headers,
        )
        assert filtered_content_res.status_code == 200
        filtered_content = filtered_content_res.json()
        assert len(filtered_content) == 1
        proficient_item = filtered_content[0]
        assert "Adding and Subtracting Fractions" in proficient_item["title"]
        assert proficient_item["difficulty_level"] == "proficient"
        content_id = proficient_item["id"]

        # 8. GET /api/v1/content/{content_id} (Full detail)
        content_detail_res = await client.get(f"/api/v1/content/{content_id}", headers=headers)
        assert content_detail_res.status_code == 200
        content_detail = content_detail_res.json()
        assert content_detail["title"] == proficient_item["title"]
        assert "Least Common Denominator" in content_detail["content_body"]
        assert content_detail["media_payload"] is not None
        assert content_detail["estimated_duration_minutes"] == 7
