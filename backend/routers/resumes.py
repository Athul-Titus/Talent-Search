import os
import threading
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db, SessionLocal
from models import Candidate, JobRole
from services.parser import parse_file
from services.ai_engine import parse_resume

router = APIRouter(prefix="/api/resumes", tags=["resumes"])

ALLOWED_TYPES = {".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png"}
MAX_SIZE_MB = 20


def _background_parse(candidate_id: int):
    """Run in background: extract text → AI parse → update DB."""
    db = SessionLocal()
    try:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            return

        candidate.status = "parsing"
        db.commit()

        # Extract text from file
        raw_text = parse_file(candidate._file_bytes, candidate.file_name)
        candidate.raw_text = raw_text

        # AI profile extraction
        profile = parse_resume(raw_text)

        candidate.parsed_profile = profile
        candidate.name = profile.get("name") or candidate.name or "Unknown"
        candidate.email = profile.get("email")
        candidate.phone = profile.get("phone")
        candidate.status = "parsed"
        db.commit()

    except Exception as e:
        db = SessionLocal()
        c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if c:
            c.status = "failed"
            c.error_message = str(e)[:500]
            db.commit()
    finally:
        db.close()


# Store file bytes temporarily (in-memory) keyed by candidate_id
_pending_bytes: dict = {}


def _run_parse(candidate_id: int, file_bytes: bytes, file_name: str):
    """Thread target: parse file and update DB."""
    db = SessionLocal()
    try:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            return
        candidate.status = "parsing"
        db.commit()

        raw_text = parse_file(file_bytes, file_name)
        candidate.raw_text = raw_text

        profile = parse_resume(raw_text)
        candidate.parsed_profile = profile
        candidate.name = profile.get("name") or "Unknown"
        candidate.email = profile.get("email")
        candidate.phone = profile.get("phone")
        candidate.status = "parsed"
        db.commit()
    except Exception as e:
        try:
            candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
            if candidate:
                candidate.status = "failed"
                candidate.error_message = str(e)[:500]
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/upload", status_code=201)
async def upload_resumes(
    job_role_id: int = Form(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    # Validate job role exists
    job = db.query(JobRole).filter(JobRole.id == job_role_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job role not found")

    created = []
    for upload in files:
        suffix = os.path.splitext(upload.filename or "")[1].lower()
        if suffix not in ALLOWED_TYPES:
            created.append({
                "file_name": upload.filename,
                "status": "failed",
                "error_message": f"Unsupported file type: {suffix}",
            })
            continue

        file_bytes = await upload.read()
        if len(file_bytes) > MAX_SIZE_MB * 1024 * 1024:
            created.append({
                "file_name": upload.filename,
                "status": "failed",
                "error_message": f"File exceeds {MAX_SIZE_MB}MB limit",
            })
            continue

        candidate = Candidate(
            job_role_id=job_role_id,
            file_name=upload.filename,
            file_type=suffix,
            status="uploading",
            name="Parsing...",
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)

        # Kick off background parse thread
        t = threading.Thread(
            target=_run_parse,
            args=(candidate.id, file_bytes, upload.filename),
            daemon=True,
        )
        t.start()

        created.append({
            "id": candidate.id,
            "file_name": upload.filename,
            "status": "uploading",
        })

    return {"uploaded": len(created), "candidates": created}


@router.get("/{job_role_id}", response_model=List[dict])
def get_candidates(job_role_id: int, db: Session = Depends(get_db)):
    candidates = (
        db.query(Candidate)
        .filter(Candidate.job_role_id == job_role_id)
        .order_by(Candidate.created_at.desc())
        .all()
    )
    return [
        {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "file_name": c.file_name,
            "file_type": c.file_type,
            "status": c.status,
            "error_message": c.error_message,
            "parsed_profile": c.parsed_profile,
            "created_at": c.created_at,
        }
        for c in candidates
    ]


@router.get("/candidate/{candidate_id}", response_model=dict)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {
        "id": c.id,
        "name": c.name,
        "email": c.email,
        "phone": c.phone,
        "file_name": c.file_name,
        "file_type": c.file_type,
        "status": c.status,
        "error_message": c.error_message,
        "parsed_profile": c.parsed_profile,
        "created_at": c.created_at,
    }


@router.delete("/{candidate_id}", status_code=204)
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    db.delete(c)
    db.commit()
