import urllib.request
import json
import uuid

BASE_URL = "http://127.0.0.1:8000"

def test_live_full_ecosystem():
    # 1. Health check
    req = urllib.request.Request(f"{BASE_URL}/api/health")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        health = json.loads(resp.read().decode())
        assert health["status"] == "ok"
        print("[SUCCESS] Live GET /api/health PASSED")

    # 2. Register
    unique_email = f"learner_{uuid.uuid4().hex[:6]}@sile.org"
    register_payload = json.dumps({
        "email": unique_email,
        "password": "ValidPassword123",
        "full_name": "Capstone Live Tester"
    }).encode("utf-8")

    reg_req = urllib.request.Request(
        f"{BASE_URL}/api/v1/auth/register",
        data=register_payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(reg_req) as resp:
        assert resp.status == 201
        print(f"[SUCCESS] Live POST /api/v1/auth/register PASSED for {unique_email}")

    # 3. Login
    login_payload = json.dumps({
        "email": unique_email,
        "password": "ValidPassword123"
    }).encode("utf-8")

    login_req = urllib.request.Request(
        f"{BASE_URL}/api/v1/auth/login",
        data=login_payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(login_req) as resp:
        assert resp.status == 200
        login_data = json.loads(resp.read().decode())
        token = login_data["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        print("[SUCCESS] Live POST /api/v1/auth/login PASSED (JWT received)")

    # 4. Current User (/me)
    me_req = urllib.request.Request(f"{BASE_URL}/api/v1/auth/me", headers=auth_headers)
    with urllib.request.urlopen(me_req) as resp:
        assert resp.status == 200
        print("[SUCCESS] Live GET /api/v1/auth/me PASSED")

    # 5. Learner Profile GET & PUT
    get_prof_req = urllib.request.Request(f"{BASE_URL}/api/v1/learner/profile", headers=auth_headers)
    with urllib.request.urlopen(get_prof_req) as resp:
        assert resp.status == 200
        print("[SUCCESS] Live GET /api/v1/learner/profile PASSED")

    put_prof_payload = json.dumps({
        "full_name": "Capstone Live Tester Updated",
        "age": 18,
        "grade": "12th Grade",
        "preferred_language": "en",
        "learning_pace": "slow",
        "preferred_content_type": "visual",
        "learning_preferences": {
            "visual_explanations": True,
            "step_by_step": True,
            "simplified_language": True,
            "audio_support": False,
            "interactive_learning": True,
            "short_sessions": True,
        },
        "accessibility_preferences": {
            "large_text": True,
            "high_contrast": True,
            "text_to_speech": False,
            "reduced_visual_complexity": False,
            "keyboard_navigation": True,
        }
    }).encode("utf-8")
    put_prof_req = urllib.request.Request(
        f"{BASE_URL}/api/v1/learner/profile",
        data=put_prof_payload,
        headers=auth_headers,
        method="PUT"
    )
    with urllib.request.urlopen(put_prof_req) as resp:
        assert resp.status == 200
        print("[SUCCESS] Live PUT /api/v1/learner/profile PASSED")

    # 6. Dashboard Overview (Initial state before assessment)
    dash_req = urllib.request.Request(f"{BASE_URL}/api/v1/dashboard/overview", headers=auth_headers)
    with urllib.request.urlopen(dash_req) as resp:
        assert resp.status == 200
        dash_initial = json.loads(resp.read().decode())
        assert dash_initial["profile_completion_percentage"] >= 70
        assert dash_initial["baseline_status"] == "not_started"
        print(f"[SUCCESS] Live GET /api/v1/dashboard/overview PASSED (Profile completion: {dash_initial['profile_completion_percentage']}%, Baseline Status: {dash_initial['baseline_status']})")

    # 7. List Assessments
    assess_list_req = urllib.request.Request(f"{BASE_URL}/api/v1/assessments", headers=auth_headers)
    with urllib.request.urlopen(assess_list_req) as resp:
        assert resp.status == 200
        assessments = json.loads(resp.read().decode())
        assert len(assessments) >= 1
        math_id = assessments[0]["id"]
        print(f"[SUCCESS] Live GET /api/v1/assessments PASSED ({len(assessments)} available)")

    # 8. Get Assessment Detail
    assess_det_req = urllib.request.Request(f"{BASE_URL}/api/v1/assessments/{math_id}", headers=auth_headers)
    with urllib.request.urlopen(assess_det_req) as resp:
        assert resp.status == 200
        detail = json.loads(resp.read().decode())
        assert len(detail["questions"]) == 10
        print(f"[SUCCESS] Live GET /api/v1/assessments/{math_id} PASSED (10 questions loaded)")

    # 9. Submit Assessment Attempt
    answers = [
        {"question_id": q["id"], "selected_answer": "B" if idx % 2 == 0 else "C"}
        for idx, q in enumerate(detail["questions"])
    ]
    attempt_payload = json.dumps({"answers": answers}).encode("utf-8")
    attempt_req = urllib.request.Request(
        f"{BASE_URL}/api/v1/assessments/{math_id}/attempt",
        data=attempt_payload,
        headers=auth_headers
    )
    with urllib.request.urlopen(attempt_req) as resp:
        assert resp.status == 201
        attempt_res = json.loads(resp.read().decode())
        print(f"[SUCCESS] Live POST /api/v1/assessments/{math_id}/attempt PASSED (Score: {attempt_res['score']}/{attempt_res['total_questions']}, Level: {attempt_res['learning_level']})")

    # 10. Dashboard Overview (Post-Assessment state)
    dash_post_req = urllib.request.Request(f"{BASE_URL}/api/v1/dashboard/overview", headers=auth_headers)
    with urllib.request.urlopen(dash_post_req) as resp:
        assert resp.status == 200
        dash_post = json.loads(resp.read().decode())
        assert dash_post["baseline_status"] == "completed"
        assert dash_post["latest_assessment"]["score"] > 0
        assert len(dash_post["assessment_history"]) >= 1
        print(f"[SUCCESS] Live GET /api/v1/dashboard/overview PASSED (Baseline Status: {dash_post['baseline_status']}, Latest Score: {dash_post['latest_assessment']['score']}/10, Level: {dash_post['latest_assessment']['learning_level']})")

    print("\n==========================================================================")
    print("ALL LIVE ENDPOINTS & COMPLETE PHASE 1 DASHBOARD FLOW PASS 100%!")
    print("==========================================================================\n")

if __name__ == "__main__":
    test_live_full_ecosystem()
