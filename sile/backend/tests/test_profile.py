import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture
async def app_with_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

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
async def test_learner_profile_get_and_update(app_with_db):
    transport = ASGITransport(app=app_with_db)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register & Login
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "learner_profile_test@sile.org",
                "password": "StrongPassword123",
                "full_name": "Jordan Hayes",
            },
        )
        assert reg_res.status_code == 201
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. GET /api/v1/learner/profile
        get_res = await client.get("/api/v1/learner/profile", headers=headers)
        assert get_res.status_code == 200
        data = get_res.json()
        assert data["full_name"] == "Jordan Hayes"
        assert data["learning_pace"] == "moderate"
        assert data["preferred_content_type"] == "mixed"
        assert data["learning_preference"]["visual_explanations"] is True
        assert data["accessibility_preference"]["high_contrast"] is False

        # 3. PUT /api/v1/learner/profile
        update_payload = {
            "full_name": "Jordan Hayes Updated",
            "age": 17,
            "grade": "11th Grade",
            "preferred_language": "en",
            "learning_pace": "slow",
            "preferred_content_type": "visual",
            "learning_preferences": {
                "visual_explanations": True,
                "step_by_step": True,
                "simplified_language": True,
                "audio_support": True,
                "interactive_learning": True,
                "short_sessions": True,
            },
            "accessibility_preferences": {
                "large_text": True,
                "high_contrast": True,
                "text_to_speech": False,
                "reduced_visual_complexity": True,
                "keyboard_navigation": True,
            },
        }
        put_res = await client.put(
            "/api/v1/learner/profile",
            json=update_payload,
            headers=headers,
        )
        assert put_res.status_code == 200
        updated = put_res.json()
        assert updated["full_name"] == "Jordan Hayes Updated"
        assert updated["age"] == 17
        assert updated["grade"] == "11th Grade"
        assert updated["learning_pace"] == "slow"
        assert updated["preferred_content_type"] == "visual"
        assert updated["learning_preference"]["simplified_language"] is True
        assert updated["accessibility_preference"]["high_contrast"] is True
