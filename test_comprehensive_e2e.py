import sys
import os
import traceback

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.abspath('backend'))
from backend.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_suite():
    passed = 0
    failed = 0

    print("=== RUNNING FULL SITE END-TO-END TEST SUITE ===")

    # Test 1: Health Check
    try:
        r = client.get("/health")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        assert r.json().get("status") == "healthy"
        print("[PASS] 1. Health check passed")
        passed += 1
    except Exception as e:
        print("[FAIL] 1. Health check failed:", e)
        failed += 1

    # Test 2: List jobs with /api prefix
    first_job_id = None
    try:
        r = client.get("/api/jobs")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        jobs = r.json()
        assert len(jobs) > 0, "Expected non-empty jobs list"
        first_job_id = jobs[0]["id"]
        print(f"[PASS] 2. List jobs (/api/jobs) passed, found {len(jobs)} jobs (First Job ID: {first_job_id})")
        passed += 1
    except Exception as e:
        print("[FAIL] 2. List jobs failed:", e)
        failed += 1

    # Test 3: List jobs without /api prefix (Middleware path rewrite)
    try:
        r = client.get("/jobs/")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        jobs = r.json()
        assert len(jobs) > 0
        print("[PASS] 3. Middleware route rewrite (/jobs/) passed")
        passed += 1
    except Exception as e:
        print("[FAIL] 3. Middleware route rewrite failed:", e)
        failed += 1

    # Test 4: Get single job details
    if first_job_id:
        try:
            r = client.get(f"/api/jobs/{first_job_id}")
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            assert r.json().get("id") == first_job_id
            print(f"[PASS] 4. Get job /{first_job_id} passed")
            passed += 1
        except Exception as e:
            print("[FAIL] 4. Get job details failed:", e)
            failed += 1

    # Test 5: Resumes by-date
    try:
        r = client.get("/api/resumes/by-date")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        resumes_by_date = r.json()
        print(f"[PASS] 5. Get resumes by date passed (Found {len(resumes_by_date)} date groups)")
        passed += 1
    except Exception as e:
        print("[FAIL] 5. Resumes by date failed:", e)
        failed += 1

    # Test 6: Resumes by job role
    first_cand_id = None
    if first_job_id:
        try:
            r = client.get(f"/api/resumes/{first_job_id}")
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            cands = r.json()
            if cands:
                first_cand_id = cands[0]["id"]
            print(f"[PASS] 6. Get candidates for job {first_job_id} passed (Count: {len(cands)})")
            passed += 1
        except Exception as e:
            print("[FAIL] 6. Get resumes by job failed:", e)
            failed += 1

    # Test 7: View Candidate Resume details
    if first_cand_id:
        try:
            r = client.get(f"/api/resumes/view/{first_cand_id}")
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            view_data = r.json()
            assert "raw_text" in view_data or "parsed_profile" in view_data
            print(f"[PASS] 7. View candidate {first_cand_id} passed (Name: {view_data.get('name')})")
            passed += 1
        except Exception as e:
            print("[FAIL] 7. View candidate failed:", e)
            failed += 1

    # Test 8: Workflow Summary
    if first_job_id:
        try:
            r = client.get(f"/api/candidates/workflow-summary/{first_job_id}")
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            summary = r.json()
            assert "shortlisted" in summary and "rejected" in summary
            print(f"[PASS] 8. Workflow summary passed: {summary}")
            passed += 1
        except Exception as e:
            print("[FAIL] 8. Workflow summary failed:", e)
            failed += 1

    # Test 9: Update Candidate status (PATCH)
    if first_cand_id:
        try:
            r = client.patch(f"/api/candidates/{first_cand_id}/status", json={"status": "shortlisted", "note": "Strong fit"})
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            res = r.json()
            assert res.get("new_status") == "shortlisted"
            print(f"[PASS] 9. Update candidate workflow status passed")
            passed += 1
        except Exception as e:
            print("[FAIL] 9. Update candidate status failed:", e)
            failed += 1

    # Test 10: Ranking Results
    if first_job_id:
        try:
            r = client.get(f"/api/ranking/{first_job_id}")
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            ranks = r.json()
            print(f"[PASS] 10. Get ranking results passed (Count: {len(ranks)})")
            passed += 1
        except Exception as e:
            print("[FAIL] 10. Get ranking results failed:", e)
            failed += 1

    # Test 11: Natural Language Query Engine
    try:
        r = client.post("/api/query", json={"question": "Who are our top candidates?", "job_role_id": first_job_id})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        answer = r.json().get("answer")
        assert answer and len(answer) > 10
        print(f"[PASS] 11. Cymonic Query Engine passed: {answer[:80]}...")
        passed += 1
    except Exception as e:
        print("[FAIL] 11. Cymonic Query Engine failed:", e)
        failed += 1

    # Test 12: Interview Questions Generator
    if first_cand_id:
        try:
            r = client.post(f"/api/candidates/{first_cand_id}/interview-questions", json={"jd_text": "Software Engineer with Python and React."})
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            questions = r.json().get("questions")
            assert questions and len(questions) > 0
            print(f"[PASS] 12. Interview Questions generator passed (Generated {len(questions)} questions)")
            passed += 1
        except Exception as e:
            print("[FAIL] 12. Interview Questions failed:", e)
            failed += 1

    # Test 13: Workflow Email Generator
    if first_cand_id:
        try:
            r = client.post(f"/api/candidates/{first_cand_id}/generate-email", json={"jd_text": "Software Engineer with Python and React.", "intent": "shortlist"})
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            email_data = r.json()
            assert email_data.get("subject") and email_data.get("body")
            print(f"[PASS] 13. Workflow Email generator passed (Subject: {email_data.get('subject')})")
            passed += 1
        except Exception as e:
            print("[FAIL] 13. Workflow Email generator failed:", e)
            failed += 1

    print(f"\n=== SUMMARY: {passed} PASSED, {failed} FAILED ===")
    return failed == 0

if __name__ == "__main__":
    success = test_suite()
    sys.exit(0 if success else 1)
