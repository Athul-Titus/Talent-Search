from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class JobRole(Base):
    __tablename__ = "job_roles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    department = Column(String(100), default="General")
    description = Column(Text, default="")
    status = Column(String(50), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    candidates = relationship(
        "Candidate", back_populates="job_role", cascade="all, delete-orphan"
    )
    ranking_results = relationship(
        "RankingResult", back_populates="job_role", cascade="all, delete-orphan"
    )


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    job_role_id = Column(
        Integer, ForeignKey("job_roles.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String(200), default="Parsing...")
    email = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    file_name = Column(String(500), nullable=True)
    file_type = Column(String(50), nullable=True)
    raw_text = Column(Text, nullable=True)
    parsed_profile = Column(JSON, nullable=True)
    status = Column(String(50), default="uploading")  # uploading, parsing, parsed, failed
    error_message = Column(Text, nullable=True)
    # ── Anti-Keyword-Stuffing fields ──────────────────────
    credibility_score   = Column(Float, nullable=True)
    flag_level          = Column(String(50), nullable=True)
    stuffed_keywords    = Column(JSON, nullable=True)
    flag_reason         = Column(Text, nullable=True)
    # ── Recruiter Workflow fields ─────────────────────────
    workflow_status     = Column(String(50), default="pending")  # pending|shortlisted|on_hold|rejected
    status_updated_at   = Column(DateTime, nullable=True)
    status_note         = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    job_role = relationship("JobRole", back_populates="candidates")
    ranking_results = relationship(
        "RankingResult", back_populates="candidate", cascade="all, delete-orphan"
    )


class RankingResult(Base):
    __tablename__ = "ranking_results"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(
        Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False
    )
    job_role_id = Column(
        Integer, ForeignKey("job_roles.id", ondelete="CASCADE"), nullable=False
    )
    jd_text = Column(Text, nullable=True)
    overall_score = Column(Float, default=0.0)
    skills_match_score = Column(Float, default=0.0)
    experience_match_score = Column(Float, default=0.0)
    education_match_score = Column(Float, default=0.0)
    domain_fit_score = Column(Float, default=0.0)
    rank = Column(Integer, nullable=True)
    justification = Column(Text, nullable=True)
    matched_skills = Column(JSON, nullable=True)
    missing_skills = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="ranking_results")
    job_role = relationship("JobRole", back_populates="ranking_results")
