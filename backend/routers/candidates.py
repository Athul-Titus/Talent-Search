from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from database import get_db
from models import Candidate
from schemas import WorkflowStatusUpdate

router = APIRouter(prefix="/api/candidates", tags=["candidates"])

VALID_STATUSES = {"pending", "shortlisted", "on_hold", "rejected"}


@router.patch("/{candidate_id}/status", response_model=dict)
def update_workflow_status(
    candidate_id: int,
    body: WorkflowStatusUpdate,
    db: Session = Depends(get_db),
):
    """Update a candidate's recruiter workflow status."""
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{body.status}'. Must be one of: {sorted(VALID_STATUSES)}"
        )

    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate.workflow_status   = body.status
    candidate.status_updated_at = datetime.utcnow()
    if body.note is not None:          # allow clearing a note by passing ""
        candidate.status_note = body.note or None
    db.commit()

    return {
        "success": True,
        "candidate_id": candidate_id,
        "new_status": body.status,
        "status_note": candidate.status_note,
        "status_updated_at": candidate.status_updated_at,
    }


@router.get("/by-role/{role_id}", response_model=List[dict])
def get_candidates_by_workflow(
    role_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Return candidates for a role, optionally filtered by workflow_status.
    e.g. GET /api/candidates/by-role/3?status=shortlisted
    """
    query = db.query(Candidate).filter(Candidate.job_role_id == role_id)
    if status:
        query = query.filter(Candidate.workflow_status == status)
    candidates = query.order_by(Candidate.created_at.desc()).all()

    return [
        {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "file_name": c.file_name,
            "status": c.status,
            "workflow_status": c.workflow_status or "pending",
            "status_note": c.status_note,
            "status_updated_at": c.status_updated_at,
        }
        for c in candidates
    ]


@router.get("/workflow-summary/{role_id}", response_model=dict)
def get_workflow_summary(role_id: int, db: Session = Depends(get_db)):
    """Return count per workflow status for a given role."""
    from sqlalchemy import func
    rows = (
        db.query(Candidate.workflow_status, func.count(Candidate.id))
        .filter(Candidate.job_role_id == role_id)
        .group_by(Candidate.workflow_status)
        .all()
    )
    counts = {"pending": 0, "shortlisted": 0, "on_hold": 0, "rejected": 0}
    for status, count in rows:
        key = status or "pending"
        counts[key] = count
    return counts
