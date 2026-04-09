# The "Smart Talent" Selection Engine

> **A Next-Generation AI Recruitment Pipeline.** 
> Built to eliminate "Volume Hiring" fatigue and bypass the archaic constraints of traditional Keyword-Matching ATS systems.

![Dashboard Preview](https://via.placeholder.com/1200x600.png?text=Cymonic+Talent+Engine)

## 📖 Background & Problem Statement

Modern Talent Acquisition is severely bottlenecked. When a single job posting attracts 1,000+ applicants, recruiters are forced to rely on "dumb" keyword-matching Applicant Tracking Systems (ATS). If a posting asks for "Java" and an expert candidate writes "JVM Specialist", traditional systems instantly reject them. 

Recruiters succumb to **Manual Fatigue** (averaging 6 seconds per resume), and candidates learn to exploit the system via **Keyword Stuffing**. The result? You miss the best talent, waste hundreds of man-hours, and interview fraudulent candidates.

**Cymonic** solves this by fundamentally shifting the pipeline away from "Word Matching" and toward "Semantic Intent".

---

## ✨ Features & Solutions

### 1. Multi-Format Ingestion Portal
A robust, error-proof dropzone built to handle the chaotic formatting of modern resumes without losing critical text structures.
*   **Format Support**: Dynamically digests `PDF`, `DOCX`, and image buffers (`JPG/PNG`).
*   **Intelligent OCR Parsing**: Utilizing `pdfplumber` and `Tesseract OCR`, text layouts (like dual-columns and sidebars) are sequentially read. It is then fed into an extremely lightweight 8-Billion parameter Llama-3.1 inference engine which structures chaotic text directly into a rigid JSON Object format.
*   **Validations**: High-performance Server-Sent Events (SSE) pipe real-time extraction progress updates straight to the UI (0–100%) and gracefully handle duplication protection.

### 2. Semantic Intent Mapper & Scorer 
Cymonic moves completely beyond keywords, treating every applicant like a semantic conversation.
*   **Hierarchy Mapping**: The scoring backend routes through NVIDIA's flagship **70-Billion Parameter (Llama 3.3)** AI model. It mathematically understands that "React" is a subset of "Frontend".
*   **Weighted Compatibility**: Evaluates the strict Job Description against the parsed JSON, producing a precise 0-100% "Match Score". Crucially, it structurally favors 5 years of explicitly detailed project experience over a fast-listed resume keyword string.
*   **AI Justification**: Automatically generates a highly specific "2-Sentence Summary of Fit" so the recruiter understands *exactly* why the AI placed a candidate at the top of the leaderboard.

### 3. "Anti-Fraud" Credibility Engine (Bonus MVP)
Solves the "Keyword Stuffing" plague natively. As candidates upload, the AI performs a logic-check against their claims. 
*   If a candidate lists "Docker, Kubernetes, AWS" under their skills, but cannot reference any work experience or academic project involving them, the engine flags them with an **Anti-Fraud UI Badge** so recruiters can safely skip them.

### 4. Recruiter Analytics Hub
Instead of static lists, the platform features a stunning Glassmorphic interface powered by **Recharts**.
*   **Global Layouts**: Visual trackers for Shortlist Rates, Upload Metrics, and Average Candidate Match thresholds.
*   **Zero-Loss Navigation**: Utilizes multi-threading and state persistence so recruiters can exit the ranking screen during a massive 1,000 resume processing job, and the UI will continue functioning in the background without dropping states.

---

## 🛠 Tech Stack

**Frontend Architecture**
*   **Framework**: React (Vite) + Recharts for visual analytics.
*   **Design System**: Native CSS custom Custom Variables powering a modern "Dark Glassmorphism" aesthetic inspired by premium SaaS.
*   **State Management**: Complex UI routing and LocalStorage caching for Job Description states.

**Backend Architecture**
*   **Framework**: Python via `FastAPI` (Blistering Fast Async API).
*   **Database**: Native `SQLite` via `SQLAlchemy` ORM (featuring `PRAGMA foreign_key` cascades for data cleanliness). 
*   **Concurrency**: Dual `ThreadPoolExecutors` managing parallel Llama inferences so uploading and ranking operate simultaneously across maximum CPU threads.
*   **Extraction Libraries**: `pdfplumber` + `Pytesseract` + `python-docx`.

**AI Integration**
*   **NVIDIA NIM Endpoints**: 
    *   `meta/llama-3.1-8b-instruct` (Highly Optimized for JSON structuring and low latency).
    *   `meta/llama-3.3-70b-instruct` (Flagship model reserved securely for candidate scoring analysis and logical consistency checks).

---

## 🚀 Setup & Installation Guide

This application requires no major external servers to boot locally. It spins up an in-memory SQLite database automatically upon connection.

### Prerequisites
*   **Node.js (v18+)**
*   **Python (3.9+)**
*   **Tesseract OCR** (Must be installed on your local OS for Image parsing).
    *   *Windows*: Download [Tesseract binary](https://github.com/UB-Mannheim/tesseract/wiki).
*   **NVIDIA NIM API Key**: Free API key strictly used to proxy the Meta Llama requests.

### 1. Backend Setup (FastAPI)
Open a terminal and navigate to the backend directory:
```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # Or on Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt
```

**Configure `.env`**
Create a `.env` file directly inside the `backend` folder:
```env
# /backend/.env
NVIDIA_API_KEY="your_nvidia_api_key_here"

# (Optional overrides)
NVIDIA_MODEL="meta/llama-3.3-70b-instruct"
NVIDIA_FAST_MODEL="meta/llama-3.1-8b-instruct"
DATABASE_URL="sqlite:///./talent_engine.db"
```

**Boot the Server**
```bash
python -m uvicorn main:app --reload
```
*The API will boot at `http://127.0.0.1:8000` and automatically create the SQLite file.*

### 2. Frontend Setup (React/Vite)
Open a completely new terminal instance and navigate to the frontend directory:
```bash
cd frontend

# Install package dependencies
npm install

# Boot the Vite Dev Server
npm run dev
```
*The User Interface will boot securely at `http://localhost:5173`.*

---

## 💡 Workflow Operations (How to play)

1. **Launch**: Open the local React server in your browser.
2. **Dashboard**: Look at the completely blank slate. Create a new "Job Role" (e.g. *Full Stack Developer*).
3. **Ingestion**: Navigate to the upload portal by clicking the Job Role. Drag and Drop a handful of dummy text resumes (PDF/DOCX) into the visual box.
4. **Streaming**: Watch as Server-Sent Events stream the extraction formatting in real-time, mapping their JSON data into cards.
5. **Score & Rank**: Head to the "Rank" panel. Type out a quick mock Job Description in the massive text field, and hit "Rank Candidates". The UI will load up the Parallel ThreadPool.
6. **Verdict**: View the gorgeous table populated with Semantically Paired match scores, and visually verify the AI's EXACT justification for the placement.
