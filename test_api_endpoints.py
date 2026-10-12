import sys
import os
import traceback
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath('backend'))
from backend.main import app

client = TestClient(app)

print("--- 1. Testing GET /health ---")
r = client.get("/health")
print(r.status_code, r.json())

print("\n--- 2. Testing GET /api/jobs/ ---")
r = client.get("/api/jobs/")
print(r.status_code)
jobs = r.json()
print(f"Returned {len(jobs)} jobs")
if jobs:
    print("First job sample keys:", list(jobs[0].keys()))
    print("First job title:", jobs[0].get("title"))
    first_job_id = jobs[0].get("id")
else:
    first_job_id = None

print("\n--- 3. Testing GET /api/resumes/by-date ---")
r = client.get("/api/resumes/by-date")
print(r.status_code)
if r.status_code == 200:
    resumes = r.json()
    print(f"Returned {len(resumes)} resumes")
else:
    print(r.text)

if first_job_id:
    print(f"\n--- 4. Testing GET /api/resumes/{first_job_id} ---")
    r = client.get(f"/api/resumes/{first_job_id}")
    print(r.status_code)
    if r.status_code == 200:
        cands = r.json()
        print(f"Candidates for job {first_job_id}: {len(cands)}")
        if cands:
            cand_id = cands[0]["id"]
            print("Candidate 0 status:", cands[0].get("status"), "name:", cands[0].get("name"))
            print(f"\n--- 5. Testing GET /api/resumes/candidate/{cand_id} ---")
            r_c = client.get(f"/api/resumes/candidate/{cand_id}")
            print(r_c.status_code, r_c.json().get("name") if r_c.status_code == 200 else r_c.text)

            print(f"\n--- 6. Testing GET /api/ranking/{first_job_id} ---")
            r_rank = client.get(f"/api/ranking/{first_job_id}")
            print(r_rank.status_code, len(r_rank.json()) if r_rank.status_code == 200 else r_rank.text)

            print(f"\n--- 7. Testing GET /api/candidates/workflow-summary/{first_job_id} ---")
            r_wf = client.get(f"/api/candidates/workflow-summary/{first_job_id}")
            print(r_wf.status_code, r_wf.json() if r_wf.status_code == 200 else r_wf.text)
