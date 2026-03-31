import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import engine, Base
from routers import jobs, resumes, ranking

# Create all tables on startup
Base.metadata.create_all(bind=engine)

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

app.include_router(jobs.router)
app.include_router(resumes.router)
app.include_router(ranking.router)


@app.get("/")
def root():
    return {"status": "ok", "app": "Smart Talent Selection Engine"}


@app.get("/health")
def health():
    return {"status": "healthy"}
