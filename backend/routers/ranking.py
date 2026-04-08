import threading
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db, SessionLocal
from models import Candidate, JobRole, RankingResult
from schemas import RankingRequest
from services.ai_engine import score_candidate
from services.scorer import compute_weighted_score

router = APIRouter(prefix="/api/ranking", tags=["ranking"])


def _score_all(job_role_id: int, jd_text: str, candidate_ids: list):
    """Background thread: score each candidate and store results."""
    db = SessionLocal()
    try:
        # Clear previous ranking for this job role
        db.query(RankingResult).filter(RankingResult.job_role_id == job_role_id).delete()
        db.commit()

        scores = []
        for cid in candidate_ids:
            c = db.query(Candidate).filter(Candidate.id == cid).first()
            if not c or not c.parsed_profile:
                continue
            try:
                result = score_candidate(jd_text, c.parsed_profile)
                overall = compute_weighted_score(result)
                scores.append((overall, c, result))
            except Exception as e:
                print(f"Scoring error for candidate {cid}: {e}")
                continue

        # Sort by score descending
        scores.sort(key=lambda x: x[0], reverse=True)

        for rank, (overall, c, result) in enumerate(scores, start=1):
            rr = RankingResult(
                candidate_id=c.id,
                job_role_id=job_role_id,
                jd_text=jd_text,
                overall_score=overall,
                skills_match_score=result.get("skills_match_score", 0) or 0,
                experience_match_score=result.get("experience_match_score", 0) or 0,
                education_match_score=result.get("education_match_score", 0) or 0,
                domain_fit_score=result.get("domain_fit_score", 0) or 0,
                rank=rank,
                # Only store justification for top 5
                justification=result.get("justification") if rank <= 5 else None,
                matched_skills=result.get("matched_skills", []),
                missing_skills=result.get("missing_skills", []),
            )
            db.add(rr)

        db.commit()
    except Exception as e:
        print(f"Ranking background error: {e}")
    finally:
        db.close()


@router.post("/score", status_code=202)
def trigger_ranking(payload: RankingRequest, db: Session = Depends(get_db)):
    """Trigger async ranking of all parsed candidates for a job role."""
    job = db.query(JobRole).filter(JobRole.id == payload.job_role_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job role not found")

    parsed_candidates = (
        db.query(Candidate)
        .filter(
            Candidate.job_role_id == payload.job_role_id,
            Candidate.status == "parsed",
        )
        .all()
    )
    if not parsed_candidates:
        raise HTTPException(
            status_code=400, detail="No parsed candidates found for this job role"
        )

    candidate_ids = [c.id for c in parsed_candidates]

    t = threading.Thread(
        target=_score_all,
        args=(payload.job_role_id, payload.jd_text, candidate_ids),
        daemon=True,
    )
    t.start()

    return {
        "message": "Ranking started",
        "candidates_queued": len(candidate_ids),
        "job_role_id": payload.job_role_id,
    }


@router.get("/{job_role_id}", response_model=List[dict])
def get_rankings(job_role_id: int, db: Session = Depends(get_db)):
    """Get ranked results for a job role."""
    results = (
        db.query(RankingResult)
        .filter(RankingResult.job_role_id == job_role_id)
        .order_by(RankingResult.rank)
        .all()
    )
    output = []
    for r in results:
        c = r.candidate
        profile = c.parsed_profile or {} if c else {}
        output.append({
            "id": r.id,
            "candidate_id": r.candidate_id,
            "candidate_name": c.name if c else "Unknown",
            "candidate_email": c.email if c else None,
            "overall_score": r.overall_score,
            "skills_match_score": r.skills_match_score,
            "experience_match_score": r.experience_match_score,
            "education_match_score": r.education_match_score,
            "domain_fit_score": r.domain_fit_score,
            "rank": r.rank,
            "justification": r.justification,
            "matched_skills": r.matched_skills or [],
            "missing_skills": r.missing_skills or [],
            "skills": (profile.get("skills") or [])[:6],
            "total_professional_years": profile.get("total_professional_years", 0),
            "domain_tags": profile.get("domain_tags", []),
            # ── Credibility / Anti-Keyword-Stuffing ─────────
            "credibility_score": c.credibility_score if c else None,
            "flag_level":        c.flag_level if c else None,
            "stuffed_keywords":  c.stuffed_keywords or [] if c else [],
            "flag_reason":       c.flag_reason if c else None,
            # ── Recruiter Workflow ───────────────────────────
            "workflow_status":   c.workflow_status or "pending" if c else "pending",
            "status_note":       c.status_note if c else None,
            "status_updated_at": c.status_updated_at if c else None,
            "created_at": r.created_at,
        })
    return output


@router.get("/status/{job_role_id}")
def get_ranking_status(job_role_id: int, db: Session = Depends(get_db)):
    """Check if ranking is complete."""
    count = (
        db.query(RankingResult)
        .filter(RankingResult.job_role_id == job_role_id)
        .count()
    )
    parsed_count = (
        db.query(Candidate)
        .filter(
            Candidate.job_role_id == job_role_id,
            Candidate.status == "parsed",
        )
        .count()
    )
    return {
        "ranked": count,
        "parsed_candidates": parsed_count,
        "is_complete": count > 0,
    }
