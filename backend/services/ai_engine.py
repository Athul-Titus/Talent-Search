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

