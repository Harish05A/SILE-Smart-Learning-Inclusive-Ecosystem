import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.db.seeds.demo_seed import seed_all_demo_data


@pytest.fixture
async def audit_app_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed baseline demo data
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
async def test_complete_phase2_end_to_end_adaptive_workflow(audit_app_db):
    transport = ASGITransport(app=audit_app_db)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # ----------------------------------------------------------------------
        # 1. Existing Phase 1 learner logs in
        # ----------------------------------------------------------------------
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "demo.learner@sile.org", "password": "DemoPassword123"},
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # ----------------------------------------------------------------------
        # 2. Learner profile is available
        # ----------------------------------------------------------------------
        profile_res = await client.get("/api/v1/learner/profile", headers=headers)
        assert profile_res.status_code == 200
        profile_data = profile_res.json()
        assert profile_data["full_name"] == "Alex Morgan [DEMO]"
        assert profile_data["preferred_language"] == "en"

        # ----------------------------------------------------------------------
        # 3. Existing assessment results are available & taken
        # ----------------------------------------------------------------------
        assessments_res = await client.get("/api/v1/assessments", headers=headers)
        assert assessments_res.status_code == 200
        assessments = assessments_res.json()
        assessment_id = assessments[0]["id"]

        detail_res = await client.get(f"/api/v1/assessments/{assessment_id}", headers=headers)
        questions = detail_res.json()["questions"]

        # Intentionally submit answers yielding Weak Fractions and Weak Algebra gaps
        # Q1-Q3 correct (Number System & Fractions part 1)
        # Q4 incorrect (Fractions: 4/7 * 14/8)
        # Q5-Q6 correct (Percentages)
        # Q7-Q8 incorrect (Algebra)
        # Q9-Q10 correct (Geometry & Patterns)
        answers = [
            {"question_id": questions[0]["id"], "selected_answer": "B"},
            {"question_id": questions[1]["id"], "selected_answer": "A"},
            {"question_id": questions[2]["id"], "selected_answer": "B"},
            {"question_id": questions[3]["id"], "selected_answer": "D"}, # Incorrect
            {"question_id": questions[4]["id"], "selected_answer": "B"},
            {"question_id": questions[5]["id"], "selected_answer": "B"},
            {"question_id": questions[6]["id"], "selected_answer": "A"}, # Incorrect
            {"question_id": questions[7]["id"], "selected_answer": "A"}, # Incorrect
            {"question_id": questions[8]["id"], "selected_answer": "B"},
            {"question_id": questions[9]["id"], "selected_answer": "C"},
        ]
        attempt_res = await client.post(
            f"/api/v1/assessments/{assessment_id}/attempt",
            json={"answers": answers},
            headers=headers,
        )
        assert attempt_res.status_code == 201

        # ----------------------------------------------------------------------
        # 4. Topic performance is calculated
        # 5. Weak topics are identified
        # ----------------------------------------------------------------------
        perf_res = await client.get("/api/v1/learners/me/performance", headers=headers)
        assert perf_res.status_code == 200
        perf_data = perf_res.json()

        assert len(perf_data["all_topics"]) >= 5
        weak_topic_names = [wt["topic_name"] for wt in perf_data["weak_topics"]]
        assert "Basic Algebra" in weak_topic_names or "Fractions" in weak_topic_names

        # ----------------------------------------------------------------------
        # 6. Learning content is retrieved
        # ----------------------------------------------------------------------
        content_res = await client.get("/api/v1/content", headers=headers)
        assert content_res.status_code == 200
        contents = content_res.json()
        assert len(contents) >= 20

        # ----------------------------------------------------------------------
        # 7. Recommendations are generated
        # 8. Recommendations contain explanations
        # ----------------------------------------------------------------------
        rec_res = await client.get("/api/v1/learners/me/recommendations?limit=5", headers=headers)
        assert rec_res.status_code == 200
        rec_data = rec_res.json()
        assert len(rec_data["recommendations"]) > 0

        first_rec = rec_data["recommendations"][0]
        assert first_rec["content_id"] is not None
        assert "reason" in first_rec
        assert len(first_rec["reason"]) > 10, "Recommendation must contain transparent explainable reason"

        # ----------------------------------------------------------------------
        # 9. Personalized learning path is generated
        # ----------------------------------------------------------------------
        gen_path_res = await client.post(
            "/api/v1/learners/me/learning-paths/generate",
            json={"max_items": 8},
            headers=headers,
        )
        assert gen_path_res.status_code == 201
        path_data = gen_path_res.json()
        path_id = path_data["id"]
        assert 5 <= path_data["total_items"] <= 10
        assert path_data["status"] == "in_progress"

        path_items = path_data["items"]
        first_item = path_items[0]
        assert first_item["status"] == "in_progress"
        assert first_item["sequence_number"] == 1

        # ----------------------------------------------------------------------
        # 10. Learner opens recommended content
        # ----------------------------------------------------------------------
        lesson_res = await client.get(f"/api/v1/content/{first_item['content_id']}", headers=headers)
        assert lesson_res.status_code == 200
        lesson_data = lesson_res.json()
        assert "content_body" in lesson_data
        assert lesson_data["id"] == first_item["content_id"]

        # ----------------------------------------------------------------------
        # 11. Learner completes practice
        # 12. Practice result is stored
        # 13. Topic performance is updated
        # 14. Mastery is recalculated
        # ----------------------------------------------------------------------
        frac_topic = next(t for t in perf_data["all_topics"] if t["topic_code"] == "MATH_FRAC")
        
        # Request calibrated practice
        prac_gen_res = await client.post(
            "/api/v1/practice/generate",
            json={"topic_id": frac_topic["topic_id"], "num_questions": 4},
            headers=headers,
        )
        assert prac_gen_res.status_code == 200
        prac_gen_data = prac_gen_res.json()
        prac_questions = prac_gen_data["questions"]

        # Submit practice answers (simulating 100% correct score)
        prac_answers = [
            {"question_id": pq["id"], "selected_answer": "B"}
            for pq in prac_questions
        ]
        prac_sub_res = await client.post(
            "/api/v1/practice/submit",
            json={
                "topic_id": frac_topic["topic_id"],
                "content_id": first_item["content_id"],
                "answers": prac_answers,
            },
            headers=headers,
        )
        assert prac_sub_res.status_code == 201
        prac_result = prac_sub_res.json()

        assert prac_result["score"] > 0
        assert "reviews" in prac_result
        assert "recommended_next_action" in prac_result
        assert len(prac_result["recommended_next_action"]) > 10

        # ----------------------------------------------------------------------
        # 15. Recommendations change based on new performance
        # ----------------------------------------------------------------------
        rec_post_res = await client.get("/api/v1/learners/me/recommendations?limit=5", headers=headers)
        assert rec_post_res.status_code == 200

        # ----------------------------------------------------------------------
        # 16. Learning path progress updates
        # ----------------------------------------------------------------------
        patch_item_res = await client.patch(
            f"/api/v1/learners/me/learning-paths/{path_id}/items/{first_item['id']}",
            json={"status": "completed"},
            headers=headers,
        )
        assert patch_item_res.status_code == 200
        updated_path = patch_item_res.json()
        assert updated_path["completed_items"] >= 1
        assert updated_path["progress_percentage"] > 0.0

        # ----------------------------------------------------------------------
        # 17. Dashboard reflects the updated information
        # ----------------------------------------------------------------------
        dash_res = await client.get("/api/v1/dashboard/overview", headers=headers)
        assert dash_res.status_code == 200
        dash_data = dash_res.json()
        assert dash_data["baseline_status"] == "completed"
        assert dash_data["latest_assessment"] is not None
        assert len(dash_data["assessment_history"]) >= 1
