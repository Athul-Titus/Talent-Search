import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import engine, Base
from routers import jobs, resumes, ranking, candidates, query

# Create all tables on startup
Base.metadata.create_all(bind=engine)

# ── SQLite migration: add credibility columns if they don't exist ──────────
from sqlalchemy import text
_MIGRATION_COLUMNS = [
    ("credibility_score",  "REAL"),
    ("flag_level",         "VARCHAR(50)"),
    ("stuffed_keywords",   "JSON"),
    ("flag_reason",        "TEXT"),
    # Recruiter workflow
    ("workflow_status",    "VARCHAR(50) DEFAULT 'pending'"),
    ("status_updated_at",  "DATETIME"),
    ("status_note",        "TEXT"),
]
with engine.connect() as _conn:
    for _col, _type in _MIGRATION_COLUMNS:
        try:
            _conn.execute(text(f"ALTER TABLE candidates ADD COLUMN {_col} {_type}"))
            _conn.commit()
        except Exception:
            pass  # Column already exists — safe to ignore


app = FastAPI(
    title="Smart Talent Selection Engine",
    description="AI-powered HR Tech — semantic resume ranking",
    version="1.0.0",
)

# CORS — allow the Vite frontend
origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global Exception Handler ──────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_msg = str(exc)
    stack_trace = traceback.format_exc()
    
    # Log to server console
    print(f"ERROR: {request.method} {request.url}")
    print(stack_trace)
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred.",
            "error_type": type(exc).__name__,
            "message": error_msg,
            # In production, we might hide the stack trace, but for this project we'll show it for better UX feedback
            "debug_trace": stack_trace if os.getenv("DEBUG") else None
        }
    )


app.include_router(jobs.router)
app.include_router(resumes.router)
app.include_router(ranking.router)
app.include_router(candidates.router)
app.include_router(query.router)


@app.get("/")
def root():
    return {"status": "ok", "app": "Smart Talent Selection Engine"}


@app.get("/health")
def health():
    return {"status": "healthy"}
