from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


# ── Job Role ─────────────────────────────────────────────────────────────────

class JobRoleCreate(BaseModel):
    title: str
    department: Optional[str] = "General"
    description: Optional[str] = ""

class JobRoleUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None

class JobRoleResponse(BaseModel):
    id: int
    title: str
    department: str
    description: str
    status: str
    created_at: datetime
    candidate_count: Optional[int] = 0
    parsed_count: Optional[int] = 0
    top_candidates: Optional[List[Any]] = []

    class Config:
        from_attributes = True


# ── Candidate ─────────────────────────────────────────────────────────────────

class CandidateResponse(BaseModel):
    id: int
    job_role_id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    parsed_profile: Optional[Any] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Ranking ───────────────────────────────────────────────────────────────────

class RankingRequest(BaseModel):
    jd_text: str
    job_role_id: int
    weights: Optional[dict] = None


class RankingResultResponse(BaseModel):
    id: int
    candidate_id: int
    candidate_name: str
    candidate_email: Optional[str] = None
    overall_score: float
    skills_match_score: float
    experience_match_score: float
    education_match_score: float
    domain_fit_score: float
    rank: int
    justification: Optional[str] = None
    matched_skills: Optional[List[str]] = []
    missing_skills: Optional[List[str]] = []
    skills: Optional[List[str]] = []
    total_professional_years: Optional[float] = 0
    domain_tags: Optional[List[str]] = []
    created_at: datetime

    class Config:
        from_attributes = True


# ── Workflow Status ────────────────────────────────────────────────────────────

class WorkflowStatusUpdate(BaseModel):
    status: str          # "pending" | "shortlisted" | "on_hold" | "rejected"
    note: Optional[str] = None   # Recruiter note (optional)


class InterviewQuestionsRequest(BaseModel):
    jd_text: str         # Full job description text

class EmailGenerationRequest(BaseModel):
    jd_text: str
    intent: str          # "shortlist" or "reject"
