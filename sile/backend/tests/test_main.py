import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "sile-backend"


@pytest.mark.asyncio
async def test_api_v1_endpoints_registered():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Check that /api/v1 routes exist
        auth_res = await client.post("/api/v1/auth/login")
        assert auth_res.status_code != 404

        learner_res = await client.get("/api/v1/learner/profile")
        # 401 Unauthorized indicates endpoint is registered and protected
        assert learner_res.status_code == 401

        assess_res = await client.get("/api/v1/assessments")
        # 401 Unauthorized indicates endpoint is registered and protected
        assert assess_res.status_code == 401
