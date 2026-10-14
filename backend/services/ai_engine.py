import os
import json
import re
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_API_KEY"),
    timeout=60.0,
    max_retries=2,
)

MODEL = os.getenv("NVIDIA_MODEL", "meta/llama-3.2-11b-vision-instruct")
FAST_MODEL = os.getenv("NVIDIA_FAST_MODEL", "meta/llama-3.2-11b-vision-instruct")

# Fallback chain: if primary model is overloaded or fails, try these in order
MODEL_FALLBACKS = [
    MODEL,
    FAST_MODEL,
    "nvidia/nemotron-3-super-120b-a12b",
]
# Deduplicate while preserving order
MODEL_FALLBACKS = list(dict.fromkeys(MODEL_FALLBACKS))


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
    if not content:
        return ""
    content = str(content).strip()
    if content.startswith("```"):
        content = re.sub(r"^```[a-z]*\n?", "", content)
        content = re.sub(r"```$", "", content)
    return content.strip()


def _call_with_retry(model: str, messages: list, temperature: float = 0.05,
                     max_tokens: int = 1024, seed: int = None,
                     max_retries: int = 3) -> str:
    """Call NVIDIA NIM with exponential backoff retry and model fallback on 503/empty/timeout."""
    models_to_try = [model] + [m for m in MODEL_FALLBACKS if m != model]
    last_error = None
    for attempt_model in models_to_try:
        for attempt in range(max_retries):
            try:
                kwargs = dict(
                    model=attempt_model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                if seed is not None:
                    kwargs["seed"] = seed
                response = client.chat.completions.create(**kwargs)
                choice = response.choices[0]
                content = choice.message.content or ""
                # If content is empty but model produced reasoning_content, check for JSON inside reasoning
                if not content.strip() and hasattr(choice.message, "reasoning_content") and choice.message.reasoning_content:
                    rc = choice.message.reasoning_content or ""
                    m = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', rc)
                    if m:
                        content = m.group(1)

                # If model returned empty string, treat as retryable
                if not content.strip():
                    print(f"[ai_engine] {attempt_model} returned empty response, retrying ({attempt+1})")
                    last_error = ValueError(f"{attempt_model} returned empty content")
                    if attempt < max_retries - 1:
                        time.sleep(2 ** attempt)
                        continue
                    break  # try next model
                return content
            except Exception as e:
                err_str = str(e)
                is_overloaded = "503" in err_str or "overloaded" in err_str.lower() or "rate" in err_str.lower() or "429" in err_str
                is_connection = (
                    "connection" in err_str.lower()
                    or "connect" in err_str.lower()
                    or "timeout" in err_str.lower()
                    or "timed out" in err_str.lower()
                    or "reset" in err_str.lower()
                    or "eof" in err_str.lower()
                    or "socket" in err_str.lower()
                )
                is_not_found = "404" in err_str or "410" in err_str
                if is_not_found:
                    # Model gone / unauthorized — skip to next model immediately
                    last_error = e
                    break
                is_retryable = is_overloaded or is_connection
                if is_retryable and attempt < max_retries - 1:
                    wait = 2 ** attempt  # 1s, 2s, 4s
                    reason = "overloaded" if is_overloaded else "network/connection error"
                    print(f"[ai_engine] {attempt_model} {reason}, retrying in {wait}s (attempt {attempt+1})")
                    time.sleep(wait)
                    last_error = e
                    continue
                last_error = e
                break  # non-retryable error, try next model
    raise last_error


def _parse_json_safe(raw: str, context: str = "") -> dict:
    """Parse JSON from model response with helpful error on empty/invalid content."""
    cleaned = _clean_json(raw)
    if not cleaned:
        raise ValueError(f"Model returned empty response{' for ' + context if context else ''}")
    try:
        return json.loads(cleaned, strict=False)
    except json.JSONDecodeError:
        # Extract the outermost JSON object or array from anywhere in the text
        match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', cleaned)
        if match:
            candidate_json = match.group(1)
            try:
                return json.loads(candidate_json, strict=False)
            except json.JSONDecodeError:
                # Try escaping raw control characters
                fixed = re.sub(r'(?<!\\)\n', r'\\n', candidate_json)
                try:
                    return json.loads(fixed, strict=False)
                except Exception:
                    pass
        raise ValueError(f"Invalid JSON from model{' for ' + context if context else ''}: raw: {cleaned[:200]}")


def parse_resume(text: str) -> dict:
    """Extract a structured profile from raw resume text via NVIDIA NIM."""
    prompt = PARSE_PROMPT + text[:8000]
    raw = _call_with_retry(
        model=FAST_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.05,
        max_tokens=1024,
    )
    return _parse_json_safe(raw, context="parse_resume")


def score_candidate(jd_text: str, candidate_profile: dict) -> dict:
    """Score a candidate profile against a job description via NVIDIA NIM."""
    profile_str = json.dumps(candidate_profile, indent=2)[:4000]
    prompt = SCORE_PROMPT.format(jd=jd_text[:4000], profile=profile_str)
    raw = _call_with_retry(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=1024,
        seed=42,
    )
    return _parse_json_safe(raw, context="score_candidate")


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
        raw = _call_with_retry(
            model=FAST_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.05,
            max_tokens=512,
        )
        data = _parse_json_safe(raw, context="analyze_credibility")

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

    raw = _call_with_retry(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=800,
    )
    data = _parse_json_safe(raw, context="generate_interview_questions")

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

    try:
        raw = _call_with_retry(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=800,
        )
        data = _parse_json_safe(raw, context="generate_workflow_email")
        return {
            "subject": data.get("subject", "Update on your application"),
            "body": data.get("body", "Thank you for applying. Please let us know when you are available to speak.")
        }
    except Exception as e:
        print(f"[ai_engine] generate_workflow_email fallback: {e}")
        cand_first_name = (parsed_profile.get("name") or "Candidate").split()[0]
        if intent.lower() == "shortlist":
            return {
                "subject": f"Update regarding your application with Cymonic",
                "body": f"Hi {cand_first_name},\n\nThank you for applying! We were very impressed by your profile and experience. We would love to invite you for a 30-minute introductory conversation next week.\n\nPlease let us know your availability.\n\nBest regards,\nCymonic Talent Team"
            }
        else:
            return {
                "subject": f"Update regarding your application with Cymonic",
                "body": f"Hi {cand_first_name},\n\nThank you for your interest in joining our team. At this time, we have decided to move forward with candidates whose experience more closely matches our technical stack requirements.\n\nWe appreciate your time and wish you the best in your search.\n\nBest regards,\nCymonic Talent Team"
            }


def _local_database_answer(question: str, candidates: list, job_roles: list) -> str:
    """
    Intelligent local query fallback when the cloud AI service is unreachable.
    Answers directly from the verified database snapshot so recruiters never get connection errors.
    """
    q = question.lower()

    # 1. Highest score / top candidates / best candidate
    if any(k in q for k in ["highest", "best", "top", "leader", "rank 1", "score"]):
        scored = [c for c in candidates if c.get("overall_score") is not None]
        scored.sort(key=lambda x: x.get("overall_score", 0), reverse=True)
        if scored:
            top = scored[0]
            others = scored[1:4]
            lines = [
                f"**{top.get('name')}** has the highest overall match score with **{top.get('overall_score')}%**."
            ]
            if top.get("skills"):
                lines.append(f"- **Top Skills:** {', '.join(top.get('skills', [])[:5])}")
            if top.get("workflow_status"):
                lines.append(f"- **Current Status:** `{top.get('workflow_status')}`")
            if others:
                lines.append("\n**Runner-ups:**")
                for c in others:
                    lines.append(f"- **{c.get('name')}**: {c.get('overall_score')}% (Status: `{c.get('workflow_status', 'pending')}`)")
            return "\n".join(lines)

    # 2. Shortlisted candidates
    if "shortlist" in q:
        shortlisted = [c for c in candidates if c.get("workflow_status") == "shortlisted"]
        if shortlisted:
            lines = [f"Found **{len(shortlisted)}** shortlisted candidate(s):"]
            for c in shortlisted:
                score_str = f" ({c.get('overall_score')}%)" if c.get("overall_score") else ""
                lines.append(f"- **{c.get('name')}**{score_str}")
            return "\n".join(lines)
        return "There are currently no candidates marked as shortlisted in this role."

    # 3. Credibility / flags / stuffed keywords
    if any(k in q for k in ["credib", "flag", "stuff", "suspicio", "risk"]):
        flagged = [c for c in candidates if c.get("credibility") in ("High Suspicion", "Moderate") or (c.get("credibility_score") and c.get("credibility_score") < 70)]
        if flagged:
            lines = [f"Found **{len(flagged)}** candidate(s) with credibility flags:"]
            for c in flagged:
                lines.append(f"- **{c.get('name')}**: Flagged as *{c.get('credibility', 'Moderate')}* (Credibility score: {c.get('credibility_score', 'N/A')}%)")
            return "\n".join(lines)
        return "All candidates currently evaluated appear credible with no high suspicion flags."

    # 4. Specific skills search (e.g. Python, React, Java, SQL, etc.)
    common_skills = ["python", "react", "java", "sql", "javascript", "typescript", "django", "node", "aws", "docker", "c++", "machine learning"]
    matched_skills = [s for s in common_skills if s in q]
    if matched_skills:
        skill = matched_skills[0]
        with_skill = [c for c in candidates if any(skill in sk.lower() for sk in c.get("skills", []))]
        with_skill.sort(key=lambda x: x.get("overall_score") or 0, reverse=True)
        if with_skill:
            lines = [f"Candidates with **{skill.title()}** skills:"]
            for c in with_skill[:5]:
                score_str = f" - Score: {c.get('overall_score')}%" if c.get("overall_score") else ""
                lines.append(f"- **{c.get('name')}**{score_str} (Skills: {', '.join(c.get('skills', [])[:4])})")
            return "\n".join(lines)
        return f"No candidates currently list skills matching '{skill.title()}'."

    # 5. General fallback summary
    if candidates:
        lines = [f"Here is a summary of the current candidate pipeline ({len(candidates)} total):"]
        for c in candidates[:4]:
            score_str = f" - Score: {c.get('overall_score')}%" if c.get("overall_score") else ""
            status_str = f" [{c.get('workflow_status', 'pending')}]"
            lines.append(f"- **{c.get('name')}**{score_str}{status_str}")
        return "\n".join(lines)
    return "No candidate data is currently available in the database."


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

    try:
        content = _call_with_retry(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question},
            ],
            temperature=0.3,
            max_tokens=800,
        )
        return content.strip()
    except Exception as e:
        print(f"[ai_engine] answer_query AI unreachable ({e}), using local database snapshot fallback")
        return _local_database_answer(question, candidates, job_roles)
