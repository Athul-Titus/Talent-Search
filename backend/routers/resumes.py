import os
import threading
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db, SessionLocal
from models import Candidate, JobRole
from services.parser import parse_file
from services.ai_engine import parse_resume

router = APIRouter(prefix="/api/resumes", tags=["resumes"])

ALLOWED_TYPES = {".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png"}
MAX_SIZE_MB = 20

# Regulate concurrent NIM API calls to prevent crashes or rate-timing issues.
parse_executor = ThreadPoolExecutor(max_workers=4)


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
    """Thread target: parse file → AI profile → credibility check → update DB."""
    db = SessionLocal()
    try:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            return
        candidate.status = "parsing"
        db.commit()

        # ① Extract raw text
        raw_text = parse_file(file_bytes, file_name)
        candidate.raw_text = raw_text

        # ② AI profile extraction
        profile = parse_resume(raw_text)
        candidate.parsed_profile = profile
        candidate.name  = profile.get("name") or "Unknown"
        candidate.email = profile.get("email")
        candidate.phone = profile.get("phone")

        # ③ Credibility detection — algorithmic (fast, always runs)
        from services.fraud_detector import algorithmic_credibility
        algo_result = algorithmic_credibility(profile, raw_text)

        # ④ AI credibility check (deeper, may fail — falls back to algo)
        try:
            from services.ai_engine import analyze_credibility
            ai_cred = analyze_credibility(profile)

            # Merge: use whichever flags MORE strongly (lower score = more suspicious)
            if ai_cred["credibility_score"] <= algo_result["credibility_score"]:
                cred = ai_cred
            else:
                cred = algo_result
                # But merge in AI's stuffed_keywords if they add information
                merged_keywords = list(
                    set(algo_result.get("stuffed_keywords", []))
                    | set(ai_cred.get("stuffed_keywords", []))
                )
                cred["stuffed_keywords"] = merged_keywords[:12]
        except Exception:
            cred = algo_result

        # ⑤ Persist credibility data
        candidate.credibility_score  = cred["credibility_score"]
        candidate.flag_level         = cred["flag_level"]
        candidate.stuffed_keywords   = cred["stuffed_keywords"]
        candidate.flag_reason        = cred["reason"]

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
        # 1. Deduplication Check
        existing = db.query(Candidate).filter(
            Candidate.job_role_id == job_role_id, 
            Candidate.file_name == upload.filename
        ).first()
        if existing:
            created.append({
                "file_name": upload.filename,
                "status": "failed",
                "error_message": "Duplicate file: already uploaded to this role",
            })
            continue

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

        # Queue into our thread pool (up to 4 active, rest wait gracefully)
        parse_executor.submit(_run_parse, candidate.id, file_bytes, upload.filename)

        created.append({
            "id": candidate.id,
            "file_name": upload.filename,
            "status": "uploading",
        })

    return {"uploaded": len(created), "candidates": created}


@router.get("/stream/{job_role_id}")
async def stream_candidate_status(job_role_id: int, request: Request, db: Session = Depends(get_db)):
    """Server-Sent Events (SSE) endpoint to stream real-time parsing status changes."""
    async def event_generator():
        last_states = {}
        while True:
            # Check if client disconnected
            if await request.is_disconnected():
                break
            
            # Fetch very lightweight status map from SQLite
            # This is 1000x faster than downloading full JSON profiles
            cands = db.query(Candidate.id, Candidate.status).filter(Candidate.job_role_id == job_role_id).all()
            current_states = {str(c[0]): c[1] for c in cands}
            
            # Only broadcast if a candidate changed status!
            if current_states != last_states:
                last_states = current_states
                yield f"data: {json.dumps(current_states)}\\n\\n"
            
            await asyncio.sleep(0.5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/by-date", response_model=List[dict])
def get_candidates_by_date(
    job_role_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Return candidates grouped by their upload date (batch date).

    Optionally filtered to a single job role via ?job_role_id=<id>.
    Each group has the shape:
      { date_label, date_iso, candidate_count, status_counts, candidates[] }
    """
    from datetime import date as dtdate
    from collections import defaultdict

    query = db.query(Candidate)
    if job_role_id:
        query = query.filter(Candidate.job_role_id == job_role_id)
    candidates = query.order_by(Candidate.created_at.desc()).all()

    # ── Group by date (UTC) ──────────────────────────────
    today = dtdate.today()
    groups: dict = defaultdict(list)
    for c in candidates:
        day = c.created_at.date() if c.created_at else today
        groups[day].append(c)

    result = []
    for day in sorted(groups.keys(), reverse=True):
        group_candidates = groups[day]

        # Human-friendly label
        delta = (today - day).days
        if delta == 0:
            label = "Today"
        elif delta == 1:
            label = "Yesterday"
        else:
            label = day.strftime("%B %d, %Y")

        # Status counts for the badge summary
        status_counts: dict = defaultdict(int)
        for c in group_candidates:
            status_counts[c.status] += 1

        result.append({
            "date_iso": day.isoformat(),
            "date_label": label,
            "candidate_count": len(group_candidates),
            "status_counts": dict(status_counts),
            "candidates": [
                {
                    "id": c.id,
                    "name": c.name,
                    "email": c.email,
                    "file_name": c.file_name,
                    "file_type": c.file_type,
                    "status": c.status,
                    "error_message": c.error_message,
                    "job_role_id": c.job_role_id,
                    "created_at": c.created_at,
                }
                for c in group_candidates
            ],
        })

    return result


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


@router.get("/view/{candidate_id}", response_model=dict)
def view_resume(candidate_id: int, db: Session = Depends(get_db)):
    """Return the full parsed profile + raw text for in-app resume viewer."""
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
        "raw_text": c.raw_text,
        "parsed_profile": c.parsed_profile,
        "credibility_score": c.credibility_score,
        "flag_level": c.flag_level,
        "created_at": c.created_at,
    }


@router.delete("/{candidate_id}", status_code=204)
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    db.delete(c)
    db.commit()
