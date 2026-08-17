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
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db

    yield app

    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.mark.asyncio
async def test_complete_auth_flow(app_with_db):
    transport = ASGITransport(app=app_with_db)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Registration - Success
        register_payload = {
            "email": "learner@sile.org",
            "password": "StrongPassword123",
            "full_name": "Maya Lin",
        }
        reg_res = await client.post("/api/v1/auth/register", json=register_payload)
        assert reg_res.status_code == 201
        reg_data = reg_res.json()
        assert "access_token" in reg_data
        assert "refresh_token" in reg_data
        assert reg_data["user"]["email"] == "learner@sile.org"
        assert reg_data["user"]["role"] == "learner"
        assert reg_data["user"]["learner_profile"]["full_name"] == "Maya Lin"
        assert reg_data["user"]["learner_profile"]["learning_pace"] == "moderate"
        assert "password_hash" not in reg_data["user"]

        token = reg_data["access_token"]

        # 2. Registration - Weak Password Failure (422)
        weak_pwd_payload = {
            "email": "another@sile.org",
            "password": "short",
            "full_name": "John Doe",
        }
        weak_res = await client.post("/api/v1/auth/register", json=weak_pwd_payload)
        assert weak_res.status_code == 422

        # 3. Registration - Duplicate Email Failure (409)
        dup_res = await client.post("/api/v1/auth/register", json=register_payload)
        assert dup_res.status_code == 409
        assert "already exists" in dup_res.json()["error"]["message"]

        # 4. Login - Valid Credentials (200)
        login_payload = {
            "email": "learner@sile.org",
            "password": "StrongPassword123",
        }
        login_res = await client.post("/api/v1/auth/login", json=login_payload)
        assert login_res.status_code == 200
        login_data = login_res.json()
        assert "access_token" in login_data
        assert login_data["user"]["email"] == "learner@sile.org"

        # 5. Login - Invalid Password (401)
        bad_login_payload = {
            "email": "learner@sile.org",
            "password": "WrongPassword999",
        }
        bad_login_res = await client.post("/api/v1/auth/login", json=bad_login_payload)
        assert bad_login_res.status_code == 401

        # 6. Login - Non-existent User (401)
        no_user_payload = {
            "email": "nonexistent@sile.org",
            "password": "StrongPassword123",
        }
        no_user_res = await client.post("/api/v1/auth/login", json=no_user_payload)
        assert no_user_res.status_code == 401

        # 7. Current User (/me) - Authorized with Bearer Token (200)
        headers = {"Authorization": f"Bearer {token}"}
        me_res = await client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["email"] == "learner@sile.org"
        assert me_data["learner_profile"]["full_name"] == "Maya Lin"

        # 8. Current User (/me) - Unauthorized without Token (401)
        unauth_me_res = await client.get("/api/v1/auth/me")
        assert unauth_me_res.status_code == 401

        # 9. Current User (/me) - Tampered Token (401)
        bad_token_headers = {"Authorization": "Bearer invalid.jwt.token"}
        bad_token_res = await client.get("/api/v1/auth/me", headers=bad_token_headers)
        assert bad_token_res.status_code == 401
