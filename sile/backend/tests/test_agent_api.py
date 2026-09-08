import uuid
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
async def test_coordinate_api_lesson_adaptation(app_with_demo_db):
    """Test POST /api/v1/agents/coordinate for authenticated lesson adaptation."""
    transport = ASGITransport(app=app_with_demo_db)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "demo.learner@sile.org", "password": "DemoPassword123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get a Topic
        topics_res = await client.get("/api/v1/topics", headers=headers)
        assert topics_res.status_code == 200
        topics = topics_res.json()
        fractions_topic = next(t for t in topics if t["code"] == "MATH_FRAC")
        topic_id = fractions_topic["id"]

        # 3. Call Coordinate endpoint for lesson_adaptation
        coord_res = await client.post(
            "/api/v1/agents/coordinate",
            headers=headers,
            json={
                "session_type": "lesson_adaptation",
                "topic_id": topic_id,
            },
        )
        assert coord_res.status_code == 200
        data = coord_res.json()

        assert "session_id" in data
        assert data["learner_context"] is not None
        assert data["adapted_content"] is not None
        assert data["accessibility_adaptation"] is not None
        assert data["assessment"] is None
        assert len(data["agent_results"]) == 3
        assert "execution_summary" in data


@pytest.mark.asyncio
async def test_coordinate_api_formative_assessment(app_with_demo_db):
    """Test POST /api/v1/agents/coordinate for formative assessment."""
    transport = ASGITransport(app=app_with_demo_db)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "demo.learner@sile.org", "password": "DemoPassword123"},
        )
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        topics_res = await client.get("/api/v1/topics", headers=headers)
        topics = topics_res.json()
        topic_id = topics[0]["id"]

        coord_res = await client.post(
            "/api/v1/agents/coordinate",
            headers=headers,
            json={
                "session_type": "formative_assessment",
                "topic_id": topic_id,
            },
        )
        assert coord_res.status_code == 200
        data = coord_res.json()

        assert data["assessment"] is not None
        assert len(data["assessment"]) >= 1
        assert len(data["agent_results"]) == 4


@pytest.mark.asyncio
async def test_coordinate_api_unauthorized(app_with_demo_db):
    """Test calling /api/v1/agents/coordinate without token returns 401."""
    transport = ASGITransport(app=app_with_demo_db)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        coord_res = await client.post(
            "/api/v1/agents/coordinate",
            json={
                "session_type": "lesson_adaptation",
                "user_inquiry": "Help me with algebra",
            },
        )
        assert coord_res.status_code == 401


@pytest.mark.asyncio
async def test_coordinate_api_invalid_request_missing_context(app_with_demo_db):
    """Test calling endpoint without topic_id, content_id, or user_inquiry returns 422."""
    transport = ASGITransport(app=app_with_demo_db)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "demo.learner@sile.org", "password": "DemoPassword123"},
        )
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        coord_res = await client.post(
            "/api/v1/agents/coordinate",
            headers=headers,
            json={
                "session_type": "lesson_adaptation",
            },
        )
        assert coord_res.status_code == 422


@pytest.mark.asyncio
async def test_coordinate_api_nonexistent_topic_returns_404(app_with_demo_db):
    """Test calling endpoint with non-existent topic_id returns 404."""
    transport = ASGITransport(app=app_with_demo_db)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "demo.learner@sile.org", "password": "DemoPassword123"},
        )
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        coord_res = await client.post(
            "/api/v1/agents/coordinate",
            headers=headers,
            json={
                "session_type": "lesson_adaptation",
                "topic_id": str(uuid.uuid4()),
            },
        )
        assert coord_res.status_code == 404


@pytest.mark.asyncio
async def test_coordinate_api_interactive_tutoring_with_inquiry(app_with_demo_db):
    """Test interactive tutoring with user inquiry."""
    transport = ASGITransport(app=app_with_demo_db)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "demo.learner@sile.org", "password": "DemoPassword123"},
        )
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        coord_res = await client.post(
            "/api/v1/agents/coordinate",
            headers=headers,
            json={
                "session_type": "interactive_tutoring",
                "user_inquiry": "How do fractions and percentages relate?",
            },
        )
        assert coord_res.status_code == 200
        data = coord_res.json()
        assert data["adapted_content"] is not None
        assert data["accessibility_adaptation"] is not None
