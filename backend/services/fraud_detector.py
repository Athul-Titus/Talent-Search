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
    Purely algorithmic credibility check based on the parsed profile.

    Returns:
      credibility_score  : int  0-100
      flag_level         : str  "High Suspicion" | "Moderate" | "Credible"
      stuffed_keywords   : list  skills that have NO backing evidence
      reason             : str  one-line human explanation
    """
    skills       = profile.get("skills") or []
    experience   = profile.get("experience") or []
    certs        = profile.get("certifications") or []

    total_skills = len(skills)
    if total_skills == 0:
        return {
            "credibility_score": 50,
            "flag_level": "Moderate",
            "stuffed_keywords": [],
            "reason": "No skills listed — unable to verify credibility.",
        }

    # ── Build evidence corpus ──────────────────────────────────────
    # Combine all experience descriptions + certifications
    exp_texts = []
    prof_count = 0
    for exp in experience:
        exp_type = (exp.get("type") or "").lower()
        if exp_type == "professional":
            prof_count += 1
        desc = " ".join([
            str(exp.get("title", "")),
            str(exp.get("company", "")),
            str(exp.get("description", "")),
        ])
        exp_texts.append(desc)

    corpus = _normalise(" ".join(exp_texts + certs + [raw_text or ""]))

    # ── Backed vs stuffed skills ───────────────────────────────────
    backed_skills   = []
    stuffed_skills  = []
    for skill in skills:
        norm_skill = _normalise(skill)
        # A skill is "backed" if any meaningful word from it appears in corpus
        words = [w for w in norm_skill.split() if len(w) > 2]
        if any(w in corpus for w in words):
            backed_skills.append(skill)
        else:
            stuffed_skills.append(skill)

    credibility_ratio = len(backed_skills) / total_skills

    # ── Keyword repetition check ───────────────────────────────────
    # Count how often each skill word appears in entire raw text
    raw_lower = _normalise(raw_text or "")
    skill_counts = Counter()
    for skill in skills:
        words = [w for w in _normalise(skill).split() if len(w) > 2]
        for w in words:
            skill_counts[w] += raw_lower.split().count(w)

    # Skills whose words appear 3+ times are considered repeatedly stuffed
    repeat_offenders = [
        skill for skill in skills
        if any(
            skill_counts[w] >= 3
            for w in [ww for ww in _normalise(skill).split() if len(ww) > 2]
        )
        and skill in stuffed_skills   # only flag if already unsupported
    ]

    # ── Auto-flag: 20+ skills but < 2 professional experiences ────
    auto_flag_high = total_skills >= 20 and prof_count < 2

    # ── Determine flag level ───────────────────────────────────────
    if auto_flag_high or credibility_ratio < 0.40:
        flag_level = "High Suspicion"
        score = max(5, int(credibility_ratio * 40))
        if auto_flag_high:
            reason = (
                f"{total_skills} skills listed but only {prof_count} "
                f"professional position(s) found — likely keyword stuffing."
            )
        else:
            n_unsupported = len(stuffed_skills)
            reason = (
                f"{n_unsupported} of {total_skills} skills have no supporting "
                f"work experience or project entry."
            )
    elif credibility_ratio < 0.70:
        flag_level = "Moderate"
        score = int(40 + credibility_ratio * 45)
        reason = (
            f"{len(stuffed_skills)} skill(s) lack explicit backing in "
            f"experience or projects."
        )
    else:
        flag_level = "Credible"
        score = int(70 + credibility_ratio * 30)
        reason = "Skills are well supported by documented work experience and projects."

    return {
        "credibility_score": min(score, 100),
        "flag_level": flag_level,
        "stuffed_keywords": stuffed_skills[:12],  # cap list length
        "reason": reason,
    }
