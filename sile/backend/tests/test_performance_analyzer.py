import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.curriculum import ContentDifficulty
from app.schemas.performance import MasteryStatus
from app.services.performance_analyzer import PerformanceAnalyzer
from app.db.seeds.demo_seed import seed_all_demo_data


def test_mastery_score_pure_calculation():
    # 0 attempts -> 0.50 baseline
    assert PerformanceAnalyzer.calculate_mastery_score(0.0, 0.0, 0) == 0.50

    # 100% lifetime & 100% recent -> 1.0
    assert PerformanceAnalyzer.calculate_mastery_score(100.0, 100.0, 10) == 1.0

    # 50% lifetime & 100% recent -> 0.40*50 + 0.60*100 = 20 + 60 = 80% (0.80)
    assert PerformanceAnalyzer.calculate_mastery_score(50.0, 100.0, 10) == 0.80

    # 100% lifetime & 0% recent -> 0.40*100 + 0.60*0 = 40% (0.40)
    assert PerformanceAnalyzer.calculate_mastery_score(100.0, 0.0, 10) == 0.40


def test_mastery_status_thresholds():
    assert PerformanceAnalyzer.determine_mastery_status(35.0) == MasteryStatus.LOW
    assert PerformanceAnalyzer.determine_mastery_status(39.9) == MasteryStatus.LOW
    assert PerformanceAnalyzer.determine_mastery_status(40.0) == MasteryStatus.DEVELOPING
    assert PerformanceAnalyzer.determine_mastery_status(69.9) == MasteryStatus.DEVELOPING
    assert PerformanceAnalyzer.determine_mastery_status(70.0) == MasteryStatus.GOOD
    assert PerformanceAnalyzer.determine_mastery_status(84.9) == MasteryStatus.GOOD
    assert PerformanceAnalyzer.determine_mastery_status(85.0) == MasteryStatus.HIGH
    assert PerformanceAnalyzer.determine_mastery_status(100.0) == MasteryStatus.HIGH


def test_difficulty_mapping_thresholds():
    assert PerformanceAnalyzer.determine_topic_difficulty(35.0) == ContentDifficulty.BEGINNER
    assert PerformanceAnalyzer.determine_topic_difficulty(55.0) == ContentDifficulty.DEVELOPING
    assert PerformanceAnalyzer.determine_topic_difficulty(75.0) == ContentDifficulty.PROFICIENT
    assert PerformanceAnalyzer.determine_topic_difficulty(90.0) == ContentDifficulty.ADVANCED


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
async def test_performance_analyzer_integration(app_with_demo_db):
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

        # 2. Get baseline assessment details
        assess_list = await client.get("/api/v1/assessments", headers=headers)
        assert assess_list.status_code == 200
        assessment_id = assess_list.json()[0]["id"]

        detail_res = await client.get(f"/api/v1/assessments/{assessment_id}", headers=headers)
        assert detail_res.status_code == 200
        questions = detail_res.json()["questions"]
        assert len(questions) == 10

        # 3. Submit tailored answers to test topic discrimination:
        # Q1 (B), Q2 (A) -> Number System (both correct -> 100%)
        # Q3 (B), Q4 (WRONG 'A') -> Fractions (1 correct, 1 wrong -> 50%)
        # Q5 (B), Q6 (B) -> Percentages (both correct -> 100%)
        # Q7 (WRONG 'A'), Q8 (WRONG 'A') -> Basic Algebra (0 correct -> 0%)
        # Q9 (B), Q10 (C) -> Geometry (both correct -> 100%)
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
        assert attempt_res.json()["score"] == 7.0

        # 4. Call GET /api/v1/learners/me/performance
        perf_res = await client.get("/api/v1/learners/me/performance", headers=headers)
        assert perf_res.status_code == 200
        perf_data = perf_res.json()

        assert perf_data["total_questions_attempted"] == 10
        assert perf_data["overall_accuracy"] == 70.0

        # Verify weak topics has Basic Algebra (< 40%)
        weak_codes = [t["topic_code"] for t in perf_data["weak_topics"]]
        assert "MATH_ALG" in weak_codes

        # Verify developing topics has Fractions (40% - 69%)
        dev_codes = [t["topic_code"] for t in perf_data["developing_topics"]]
        assert "MATH_FRAC" in dev_codes

        # Verify strong topics has Number System, Percentages, and Geometry (>= 70%)
        strong_codes = [t["topic_code"] for t in perf_data["strong_topics"]]
        assert "MATH_NUM" in strong_codes
        assert "MATH_PERC" in strong_codes
        assert "MATH_GEOM" in strong_codes

        # 5. Also test alias GET /api/v1/learner/performance
        alias_res = await client.get("/api/v1/learner/performance", headers=headers)
        assert alias_res.status_code == 200
        assert alias_res.json()["overall_accuracy"] == 70.0
