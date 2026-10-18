"""
Anti-Keyword-Stuffing Detection — Algorithmic credibility analysis.

Runs BEFORE AI analysis as a fast pre-filter. The AI analysis
(in ai_engine.py) provides deeper semantic verification.
"""
import re
from collections import Counter


def _normalise(text: str) -> str:
    return re.sub(r"[^a-z0-9 ]", " ", text.lower())


def algorithmic_credibility(profile: dict, raw_text: str = "") -> dict:
    """
    Algorithmic credibility check based on the parsed profile and document context.
    Evaluates whether listed skills have corresponding context across work experience,
    projects, certifications, and resume narrative.

    Returns:
      credibility_score  : int  0-100
      flag_level         : str  "High Suspicion" | "Moderate" | "Credible"
      stuffed_keywords   : list  skills that have NO backing evidence
      reason             : str  one-line human explanation
    """
    skills = profile.get("skills") or []
    experience = profile.get("experience") or []
    projects = profile.get("projects") or []
    certs = profile.get("certifications") or []
    summary = profile.get("summary") or ""
    education = profile.get("education") or []

    total_skills = len(skills)
    if total_skills == 0:
        return {
            "credibility_score": 50,
            "flag_level": "Moderate",
            "stuffed_keywords": [],
            "reason": "No skills listed — unable to verify credibility.",
        }

    # ── 1. Build comprehensive evidence corpus ───────────────────────
    evidence_parts = []

    # Experience details
    prof_count = 0
    for exp in experience:
        exp_type = (exp.get("type") or "").lower()
        if exp_type == "professional":
            prof_count += 1
        evidence_parts.extend([
            str(exp.get("title") or ""),
            str(exp.get("company") or ""),
            str(exp.get("description") or ""),
        ])

    # Projects (critical for students, open-source contributors, and developers)
    for prj in projects:
        evidence_parts.extend([
            str(prj.get("name") or prj.get("title") or ""),
            str(prj.get("description") or ""),
            " ".join(prj.get("technologies") or []),
        ])

    # Certifications & summary
    evidence_parts.extend([str(c) for c in certs])
    if summary:
        evidence_parts.append(str(summary))

    # Education fields
    for edu in education:
        evidence_parts.extend([
            str(edu.get("degree") or ""),
            str(edu.get("field") or ""),
            str(edu.get("institution") or ""),
        ])

    # Raw text narrative (exclude isolated skills header blocks to isolate project/work narrative)
    if raw_text:
        lines = raw_text.split("\n")
        non_skills = []
        in_skills = False
        for l in lines:
            nl = l.strip().lower()
            if any(h in nl for h in ["technical skills", "skills:", "skills &", "core skills", "key skills", "competencies"]):
                in_skills = True
                continue
            if in_skills and any(h in nl for h in ["project", "experience", "education", "certifications", "summary", "hackathon", "achievements", "employment", "internship"]):
                in_skills = False
            if not in_skills:
                non_skills.append(l)
        evidence_parts.append(" ".join(non_skills))

    corpus = _normalise(" ".join(evidence_parts))

    # ── 2. Backed vs unbacked skills ────────────────────────────────
    backed_skills = []
    unbacked_skills = []
    
    stop_words = {"and", "for", "the", "with", "basics", "core", "tool", "tools", "using"}
    for skill in skills:
        norm_skill = _normalise(skill)
        words = [w for w in norm_skill.split() if len(w) > 1 and w not in stop_words]
        if not words:
            words = [norm_skill.strip()] if norm_skill.strip() else []

        # A skill is backed if key terms appear in evidence corpus
        is_backed = False
        if norm_skill in corpus:
            is_backed = True
        elif any(w in corpus for w in words):
            is_backed = True
        
        if is_backed:
            backed_skills.append(skill)
        else:
            unbacked_skills.append(skill)

    credibility_ratio = len(backed_skills) / total_skills if total_skills > 0 else 1.0

    # ── 3. Determine flag level and score ───────────────────────────
    # A candidate is Credible if >= 70% of skills are backed, or if they have at most 3 unbacked general skills
    if credibility_ratio >= 0.70 or (len(unbacked_skills) <= 3 and total_skills >= 5):
        flag_level = "Credible"
        score = min(100, int(75 + credibility_ratio * 25))
        reason = "Skills are well supported by documented work experience, projects, or education."
        stuffed_for_display = unbacked_skills[:6]
    elif credibility_ratio >= 0.40:
        flag_level = "Moderate"
        score = int(45 + credibility_ratio * 30)
        reason = f"{len(unbacked_skills)} skill(s) lack explicit context in project or experience entries."
        stuffed_for_display = unbacked_skills[:12]
    else:
        flag_level = "High Suspicion"
        score = max(10, int(credibility_ratio * 40))
        reason = f"{len(unbacked_skills)} of {total_skills} skills have no supporting work experience or project entry."
        stuffed_for_display = unbacked_skills[:12]

    # Stuffed keywords must strictly be a subset of candidate's own skills
    return {
        "credibility_score": score,
        "flag_level": flag_level,
        "stuffed_keywords": stuffed_for_display,
        "reason": reason,
    }
