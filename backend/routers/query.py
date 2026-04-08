from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Candidate, JobRole, RankingResult
from services.ai_engine import answer_query

router = APIRouter(prefix="/api/query", tags=["query"])


class QueryRequest(BaseModel):
    question: str
    job_role_id: Optional[int] = None  # optional scope filter


@router.post("")
def run_query(payload: QueryRequest, db: Session = Depends(get_db)):
    """
    Natural Language Query Engine.
    Serializes database context and asks the LLM to answer in plain English.
    """
    # ── Build a compact, safe snapshot of the database ──────────────────────
    # We never send raw_text or file_bytes — only structured intelligence.
    
    jobs = db.query(JobRole).all()
    
    # Filter candidates by job_role_id if specified
    cand_query = db.query(Candidate).filter(Candidate.status == "parsed")
    if payload.job_role_id:
        cand_query = cand_query.filter(Candidate.job_role_id == payload.job_role_id)
    candidates = cand_query.all()
    
    # Pull ranking context
    rank_query = db.query(RankingResult)
    if payload.job_role_id:
        rank_query = rank_query.filter(RankingResult.job_role_id == payload.job_role_id)
    rankings = rank_query.all()
    
    # Build lookup for fast joins
    rank_map = {r.candidate_id: r for r in rankings}

    # Serialize compact candidate rows
    candidate_rows = []
    for c in candidates:
        profile = c.parsed_profile or {}
        rr = rank_map.get(c.id)
        candidate_rows.append({
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "job_role_id": c.job_role_id,
            "workflow_status": c.workflow_status or "pending",
            "credibility": c.flag_level,
            "skills": profile.get("skills", []),
            "total_experience_years": profile.get("total_professional_years"),
            "education": profile.get("education", []),
            "rank": rr.rank if rr else None,
            "overall_score": round(rr.overall_score, 1) if rr else None,
            "skills_score": round(rr.skills_match_score, 1) if rr else None,
            "matched_skills": rr.matched_skills if rr else [],
            "missing_skills": rr.missing_skills if rr else [],
            "justification": rr.justification if rr else None,
        })

    job_rows = [
        {"id": j.id, "title": j.title, "department": j.department, "status": j.status}
        for j in jobs
    ]

    answer = answer_query(
        question=payload.question,
        candidates=candidate_rows,
        job_roles=job_rows,
    )

    return {"answer": answer, "candidate_count": len(candidate_rows)}
