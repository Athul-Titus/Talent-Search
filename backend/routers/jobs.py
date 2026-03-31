from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import JobRole, Candidate, RankingResult
from schemas import JobRoleCreate, JobRoleResponse

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def build_job_response(job: JobRole) -> dict:
    parsed_candidates = [c for c in job.candidates if c.status == "parsed"]
    top_candidates = []
    # Pull top candidates from latest ranking results if available
    scored = []
    for c in parsed_candidates:
        if c.ranking_results:
            latest = max(c.ranking_results, key=lambda r: r.created_at)
            scored.append((latest.overall_score, c))
    scored.sort(key=lambda x: x[0], reverse=True)
    for score, c in scored[:3]:
        profile = c.parsed_profile or {}
        top_candidates.append({
            "id": c.id,
            "name": c.name,
            "score": score,
            "skills": (profile.get("skills") or [])[:4],
            "total_professional_years": profile.get("total_professional_years", 0),
        })

    return {
        "id": job.id,
        "title": job.title,
        "department": job.department or "General",
        "description": job.description or "",
        "status": job.status,
        "created_at": job.created_at,
        "candidate_count": len(job.candidates),
        "parsed_count": len(parsed_candidates),
        "top_candidates": top_candidates,
    }


@router.get("/", response_model=List[dict])
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(JobRole).order_by(JobRole.created_at.desc()).all()
    return [build_job_response(j) for j in jobs]


@router.post("/", response_model=dict, status_code=201)
def create_job(payload: JobRoleCreate, db: Session = Depends(get_db)):
    job = JobRole(
        title=payload.title,
        department=payload.department or "General",
        description=payload.description or "",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return build_job_response(job)


@router.get("/{job_id}", response_model=dict)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(JobRole).filter(JobRole.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job role not found")
    return build_job_response(job)


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(JobRole).filter(JobRole.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job role not found")
    db.delete(job)
    db.commit()
