import os
import json
import re
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_API_KEY"),
)

MODEL = os.getenv("NVIDIA_MODEL", "meta/llama-3.3-70b-instruct")


PARSE_PROMPT = """You are an expert HR analyst and resume parser. Extract structured information from the resume text below.
Return ONLY a valid JSON object. No markdown, no explanation, no extra text.

Required JSON structure:
{
  "name": "Full Name (string)",
  "email": "email or null",
  "phone": "phone or null",
  "skills": ["list of specific technical skills, tools, languages"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration_years": 2.5,
      "type": "professional",
      "description": "Brief role description"
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science",
      "field": "Computer Science",
      "institution": "University Name",
      "year": 2020
    }
  ],
  "certifications": ["list of certifications"],
  "total_professional_years": 5.0,
  "domain_tags": ["frontend", "backend", "machine learning", "data science", "devops", "mobile", "cloud", "security"],
  "summary": "2-3 sentence professional summary"
}

Rules:
- type must be one of: professional, academic, internship, freelance
- total_professional_years only counts real work experience (not academic projects)
- For duration_years, estimate from dates if not explicit; use 0.5 for short stints
- skills: be specific (React.js, not just "frontend"); include ALL mentioned technologies
- domain_tags: pick from common categories, max 5
- If any field is absent, use null or empty array

Resume text:
"""


SCORE_PROMPT = """You are an expert HR talent evaluator. Score this candidate's fit for the job description.
Return ONLY a valid JSON object. No markdown, no explanation, no extra text.

Job Description:
{jd}

Candidate Profile (JSON):
{profile}

Return this exact structure:
{{
  "overall_score": 87.5,
  "skills_match_score": 90,
  "experience_match_score": 85,
  "education_match_score": 80,
  "domain_fit_score": 88,
  "matched_skills": ["React", "Node.js"],
  "missing_skills": ["GraphQL", "AWS"],
  "justification": "Two-sentence summary of why this candidate is or is not a strong fit."
}}

Scoring guidelines:
- overall_score = weighted: skills 30% + experience 35% + education 15% + domain 20%
- Experience scoring: weight PROFESSIONAL experience 3x over academic projects or internships
- Skills: semantic match counts (PyTorch == Machine Learning, React == Frontend, JVM == Java)
- Scores are 0-100 floats
- justification: exactly 2 sentences, specific about which skills/experience match or are missing
"""


def _clean_json(content: str) -> str:
    """Strip markdown fences if present."""
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```[a-z]*\n?", "", content)
        content = re.sub(r"```$", "", content)
    return content.strip()


def parse_resume(text: str) -> dict:
    """Extract a structured profile from raw resume text via NVIDIA NIM."""
    prompt = PARSE_PROMPT + text[:8000]
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.05,
        max_tokens=2048,
    )
    raw = _clean_json(response.choices[0].message.content)
    return json.loads(raw)


def score_candidate(jd_text: str, candidate_profile: dict) -> dict:
    """Score a candidate profile against a job description via NVIDIA NIM."""
    profile_str = json.dumps(candidate_profile, indent=2)[:4000]
    prompt = SCORE_PROMPT.format(jd=jd_text[:4000], profile=profile_str)

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.05,
        max_tokens=1024,
    )
    raw = _clean_json(response.choices[0].message.content)
    return json.loads(raw)


# ── Credibility / Anti-Keyword-Stuffing ─────────────────────────────────────

CREDIBILITY_PROMPT = """You are an expert HR fraud analyst specialising in detecting resume keyword stuffing.
Analyse whether this candidate's listed skills are genuinely backed by their work experience, projects, or certifications.
Return ONLY a valid JSON object. No markdown, no explanation, no extra text.

Candidate Profile (JSON):
{profile}

Return this exact structure:
{{
  "credibility_score": 75,
  "flag_level": "Moderate",
  "stuffed_keywords": ["Docker", "Kubernetes"],
  "reason": "One sentence explaining the credibility assessment."
}}

Rules:
- credibility_score: 0 (obvious stuffing) to 100 (all skills clearly evidenced)
- flag_level must be EXACTLY one of: "High Suspicion", "Moderate", "Credible"
  · "High Suspicion" → credibility_score < 40  (many skills with no evidence whatsoever)
  · "Moderate"       → 40-70 (some skills appear listed without clear project/job backing)
  · "Credible"       → > 70  (skills are well supported by experience and projects)
- stuffed_keywords: skills that appear LISTED but are NOT backed by any experience entry, project, or certification
- reason: exactly ONE sentence, specific about which signals triggered the flag
"""


def analyze_credibility(parsed_profile: dict) -> dict:
    """
    Use NVIDIA NIM to semantically validate whether listed skills
    are backed by actual experience.  Returns the same shape as
    fraud_detector.algorithmic_credibility().
    """
    profile_str = json.dumps(parsed_profile, indent=2)[:4000]
    prompt = CREDIBILITY_PROMPT.format(profile=profile_str)

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.05,
            max_tokens=512,
        )
        raw = _clean_json(response.choices[0].message.content)
        data = json.loads(raw)

        # Sanitise / ensure all required keys exist
        flag_map = {"High Suspicion", "Moderate", "Credible"}
        flag_level = data.get("flag_level", "Moderate")
        if flag_level not in flag_map:
            flag_level = "Moderate"

        return {
            "credibility_score": max(0, min(100, int(data.get("credibility_score", 50)))),
            "flag_level": flag_level,
            "stuffed_keywords": data.get("stuffed_keywords") or [],
            "reason": data.get("reason") or "Unable to determine credibility.",
        }
    except Exception as e:
        # Return a neutral result on AI failure — algorithmic fallback handles it
        return {
            "credibility_score": 50,
            "flag_level": "Moderate",
            "stuffed_keywords": [],
            "reason": f"AI credibility check unavailable: {str(e)[:80]}",
        }


# ── Interview Question Generator ────────────────────────────────────────────

INTERVIEW_PROMPT = """You are a senior technical hiring manager preparing a structured interview.
Analyze this candidate's resume and the Job Description, then generate EXACTLY 2-3 interview questions.

Job Description:
{jd}

Candidate Profile (JSON):
{profile}

STRICT RULES:
- Generate EXACTLY 2 or 3 questions — never 1, never 4+
- Each question MUST target ONE specific thing: an unverified skill claim, an experience gap vs JD, an unsupported achievement, or a vague claim
- Questions must be SPECIFIC — reference actual tool names, company names, project details, or timeframes from the resume
- NEVER generate generic questions like "tell me about yourself", "where do you see yourself in 5 years", "what are your strengths/weaknesses"
- Each question should feel like it came from someone who read the resume carefully and noticed something
- Reason tag: exactly 3-5 words describing WHY this question was chosen (e.g. "Unverified skill claim", "Gap vs JD", "Unsupported leadership claim")

Return ONLY valid JSON in this exact format:
{{
  "questions": [
    {{
      "question": "Your precise, specific interview question here",
      "reason": "3-5 word reason tag"
    }}
  ]
}}"""


def generate_interview_questions(parsed_profile: dict, jd_text: str) -> dict:
    """
    Generate 2-3 targeted, laser-focused interview questions for a specific candidate
    based on their resume gaps and the JD requirements.
    """
    profile_str = json.dumps(parsed_profile, indent=2)[:5000]
    prompt = INTERVIEW_PROMPT.format(
        jd=jd_text[:3000],
        profile=profile_str,
    )

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,   # Slightly higher for creative specificity
        max_tokens=800,
    )
    raw = _clean_json(response.choices[0].message.content)
    data = json.loads(raw)

    # Validate and cap at 3 questions
    questions = data.get("questions") or []
    questions = [
        {
            "question": str(q.get("question", "")).strip(),
            "reason":   str(q.get("reason", "")).strip(),
        }
        for q in questions
        if q.get("question")
    ][:3]

    return {"questions": questions}


# ── Workflow Email Drafter ────────────────────────────────────────────────────

EMAIL_PROMPT = """You are a senior technical recruiter drafting a highly professional workflow email to a candidate.
Intent: {intent}

Job Description context:
{jd}

Candidate Profile (JSON):
{profile}

RULES for 'shortlist' intent:
1. Write a warm, enthusiastic email offering an interview.
2. Specifically call out ONE impressive skill or experience from their resume that matched the JD, proving this isn't an automated blast.
3. Ask for their availability for a 30-minute introductory sync next week.
4. Keep it concise (under 150 words).

RULES for 'reject' intent:
1. Write a polite, respectful rejection email.
2. Frame it as "moving forward with candidates whose experience more closely aligns with our specific technical stack."
3. Keep it brief, standard, and legally safe (under 100 words).

Do NOT generate placeholders like [Company Name] or [Your Name]. Use "Cymonic Talent Team" as the sender. Address the candidate by their first name.

Return ONLY valid JSON in this format:
{{
  "subject": "The email subject line here",
  "body": "The complete text of the email here, using \\n for line breaks."
}}"""

def generate_workflow_email(parsed_profile: dict, jd_text: str, intent: str) -> dict:
    """
    Generate an ultra-personalized Shortlist or Rejection email.
    """
    profile_str = json.dumps(parsed_profile, indent=2)[:4000]
    prompt = EMAIL_PROMPT.format(
        intent=intent.upper(),
        jd=jd_text[:3000],
        profile=profile_str,
    )

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=600,
    )
    raw = _clean_json(response.choices[0].message.content)
    try:
        data = json.loads(raw)
        return {
            "subject": data.get("subject", "Update on your application"),
            "body": data.get("body", "Please contact us for an update on your application.")
        }
    except Exception:
        return {
            "subject": "Update on your application",
            "body": "Thank you for applying. Please let us know when you are available to speak."
        }


def answer_query(question: str, candidates: list, job_roles: list) -> str:
    """
    Cymonic Query Engine: answers a natural language question based on a 
    structured snapshot of candidate and ranking data from the database.
    """
    # Compact context serialisation (keep tokens low)
    context = json.dumps(
        {"job_roles": job_roles, "candidates": candidates},
        indent=None,
        default=str
    )

    system_prompt = f"""You are the Cymonic Query Engine, an expert AI assistant integrated directly into a talent acquisition platform's database.

You have been provided with a real-time JSON snapshot of the recruiter's current candidate pipeline data. This includes candidate names, skills, experience, credibility flags, ranking scores, workflow statuses (shortlisted / rejected / on_hold / pending), and the job roles they applied for.

Your mission is to answer the recruiter's natural language questions precisely, concisely, and in a conversational tone. Act like a highly intelligent colleague who *knows the data deeply*.

Rules:
- Answer ONLY from the provided data snapshot. Never hallucinate or invent candidates.
- Be specific. If they ask "who is the best React developer?" — name the candidate, give their score, and briefly explain why.
- Use bullet points for lists of more than 2 items.
- If the data is insufficient to fully answer the question, say so honestly.
- Keep your answers focused. Do not narrate the data dump — only answer what is asked.
- Use proper recruiter vocabulary (shortlisted, pipeline, credibility risk, etc.).

DATABASE SNAPSHOT:
{context}"""

    completion = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
        temperature=0.4,
        max_tokens=700,
    )

    return completion.choices[0].message.content.strip()
