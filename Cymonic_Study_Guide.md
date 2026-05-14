# Cymonic Talent Engine: Technical Master Study Guide

**Purpose:** This document is a complete architectural brain-dump of the Cymonic Talent Engine. Paste this into Gemini, ChatGPT, or use it to study for your technical interviews. It contains every technical decision, API pipeline, and algorithm used.

---

## 🏗️ 1. Technical Architecture (The Stack)

### Frontend (User Interface)
*   **Framework**: React (built with Vite for fast Hot Module Replacement).
*   **Styling**: Custom CSS focused on "Dark Glassmorphism" (utilizing `backdrop-filter: blur` and translucent RGBA backgrounds). Avoided Bootstrap to show custom CSS/UI capability.
*   **Data Visualization**: `Recharts` library used to render dynamic Donut Charts (Pipeline distributions) and Radar Charts (Candidate Skill Gaps).
*   **State Management**: Complex React Hooks (`useState`, `useEffect`) and tight integration with `localStorage` to cache Job Descriptions and prevent data-loss if the browser refreshes (Zero-Loss Navigation).
*   **Export Integration**: `html2canvas` and `jsPDF` for generating downloadable 1-Click reports of candidate profiles.

### Backend (The Server)
*   **Framework**: `FastAPI` (Python). Chosen over Flask/Django because it is natively asynchronous (`async/await`), insanely fast, and perfect for streaming data.
*   **Concurrency**: Utilized `ThreadPoolExecutor` from Python's `concurrent.futures`. This allows the server to process complex AI math in background threads (up to 10 at a time) without freezing the FastAPI web threads.
*   **Real-time Streaming**: Used **Server-Sent Events (SSE)**. Unlike WebSockets (which are heavy 2-way pipes), SSE allows the server to push fast, 1-way status updates (`uploading` -> `parsing` -> `completed`) directly to the frontend for loading animations.

### Database (Storage)
*   **Engine**: `SQLite` natively integrated via `SQLAlchemy` (Python's leading ORM).
*   **Technical Detail**: Built custom Engine listeners using `PRAGMA foreign_keys=ON;`. By default SQLite doesn't obey cascade deletions, which would cause database bloat when jobs are deleted. We forced strict relational mapping to prevent orphaned JSON records.

---

## 🧠 2. The AI & Data Pipeline (The "Secret Sauce")

### The Ingestion & OCR Layer
When a recruiter uploads a resume, it hits the `backend/services/parser.py` router. 
*   **PDFs**: Uses `pdfplumber`. It mechanically reads the Cartesian (X/Y) coordinates of text. This is critical because it prevents two-column resumes from merging unrelated sentences together.
*   **Word Docs**: Uses `python-docx` to extract raw paragraphs and internal tables.
*   **Images (JPG/PNG)**: Uses `Pillow` and `pytesseract` to natively execute Optical Character Recognition (OCR), extracting text directly from visual pixels.

### The "Dual-Routing" AI Architecture
We completely bypassed using one single intelligence model to optimize for blindingly fast latency.
*   **Model 1 (The Formatter)**: `meta/llama-3.1-8b-instruct`. We use this small, lightning-fast 8-Billion parameter model to blindly ingest the raw, chaotic OCR text and output a highly standardized, strict JSON profile (name, skills, duration, etc).
*   **Model 2 (The Scorer)**: `meta/llama-3.3-70b-instruct`. We use NVIDIA's massive 70-Billion parameter flagship model for advanced mathematical reasoning. It cross-evaluates the candidate's parsed JSON directly against the Job Description to calculate the precise 0-100% Match Scores.

---

## ⚙️ 3. Core Algorithms to Memorize

### The "Anti-Fraud" Credibility Algorithm
*   **The Problem**: ATS systems are destroyed by candidates putting "AWS, Docker, React" at the bottom of their resumes in invisible text (Keyword Stuffing).
*   **The Solution**: When parsing finishes, the 8B AI performs an integrity sanity-check. It loops through every listed "Skill" and scans the "Work Experience / Educational Projects" arrays. If the skill is completely unsupported by any contextual project evidence, it flags the candidate natively in the UI with a `Credibility Warning`.

### The Semantic Ranking Engine
*   **The Problem**: Exact Regex strings fail (e.g., JD asks for "Java", candidate claims "JVM").
*   **The Solution**: The 70B Model bypasses string matching entirely. It ranks based on **Semantic Intent**. Furthermore, recruiters can use sliders to adjust the mathematical weight of the scoring. The AI multiplies its confidence by weights: `(Skills * 0.4) + (Experience * 0.4) + (Education * 0.2)` producing a highly customized Final Competency Score.

### The Interview Copilot Algorithm
*   Instead of ending at the dashboard, expanding a candidate's profile triggers the AI to cross-analyze their "Skill Gaps". It then generates 3 to 5 targeted behavioral and technical interview questions specifically designed to test the weaknesses the AI found in their resume.

---

## 🚀 4. Deployment Architecture
*   **Frontend**: Hosted securely on **Vercel** with dynamic `VITE_API_URL` runtime parsing.
*   **Backend**: Hosted manually on a **Render.com** free-tier Web Service.
*   **APIs**: Uses the `NVIDIA NIM API` via standard OpenAI client libraries to proxy the Meta Llama requests effortlessly without managing heavy GPU hardware.

---

## 🔄 5. The Full Working Data Flow (End-to-End Pipeline)

If an interviewer asks, *"Walk me through exactly how your app works step-by-step,"* you can give them this exact lifecycle:

**Step 1: The Upload (React to FastAPI)**
1. The recruiter drags a `PDF` or `JPG` into the Vercel React frontend.
2. React packages it as a `multipart/form-data` payload and uses `Axios` to POST it to the Render FastAPI backend (`/api/resumes/upload`).
3. The server immediately returns a `201 Accepted` and spins off a background thread so the user's browser doesn't freeze.

**Step 2: Server-Sent Events (SSE)**
4. While the background thread runs, the frontend opens an SSE connection (`/api/resumes/stream`).
5. This creates a 1-way pipe where the backend continuously pings the frontend saying: *"Status: Uploading"* → *"Status: Parsing"* so the UI loads smoothly.

**Step 3: Extraction & Structuring (OCR + 8B AI)**
6. Inside the background thread, python uses `pdfplumber` or `pytesseract` to brutally scrape the raw text out of the document's coordinates.
7. This raw, messy blob of text is fired to the **8B Llama Model** which forces it into a strict, clean JSON object (mapping titles, skills, and dates perfectly).

**Step 4: The Credibility Check (Anti-Fraud)**
8. Before saving the JSON to the SQLite database, the 8B AI runs a secondary pass. It looks at the "Skills" array and scans the "Experience" array. If it finds skills that have no matching experience, it silently attaches a `Credibility: Suspicious` flag to the JSON.
9. The clean data is securely saved into SQLite via SQLAlchemy.

**Step 5: The Ranking (70B AI)**
10. The recruiter pastes a Job Description and clicks "Rank Candidates".
11. The frontend hits `/api/ranking/score` and the backend launches a massive **10-process ThreadPoolExecutor**. 
12. 10 simultaneous threads fire off to the flagship **70B Llama Model**. The AI mathematically compares the candidates' structured JSON against the JD and calculates a 0-100 Match Score, plus generating a 2-sentence human-readable justification.
13. Over on the frontend, a React `setInterval` polling hook queries the backend every second. The moment it detects the ranking threading is complete, it pulls the final array and renders it into the glowing glass Dashboard!
