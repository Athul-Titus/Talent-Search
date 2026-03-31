# Skill synonym/hierarchy map for semantic normalization
SKILL_HIERARCHY = {
    # Frontend
    "react": "Frontend Development",
    "react.js": "Frontend Development",
    "reactjs": "Frontend Development",
    "vue": "Frontend Development",
    "vue.js": "Frontend Development",
    "angular": "Frontend Development",
    "svelte": "Frontend Development",
    "next.js": "Frontend Development",
    "nextjs": "Frontend Development",
    "html": "Frontend Development",
    "css": "Frontend Development",
    "tailwind": "Frontend Development",
    "sass": "Frontend Development",
    "webpack": "Frontend Development",
    "vite": "Frontend Development",
    # Backend
    "node.js": "Backend Development",
    "nodejs": "Backend Development",
    "express": "Backend Development",
    "fastapi": "Backend Development",
    "django": "Backend Development",
    "flask": "Backend Development",
    "spring": "Backend Development",
    "spring boot": "Backend Development",
    "rails": "Backend Development",
    "laravel": "Backend Development",
    # Mobile
    "flutter": "Mobile Development",
    "react native": "Mobile Development",
    "swift": "Mobile Development",
    "kotlin": "Mobile Development",
    "ios": "Mobile Development",
    "android": "Mobile Development",
    # AI/ML
    "pytorch": "Machine Learning",
    "tensorflow": "Machine Learning",
    "keras": "Machine Learning",
    "scikit-learn": "Machine Learning",
    "sklearn": "Machine Learning",
    "hugging face": "Machine Learning",
    "transformers": "Machine Learning",
    "llm": "Machine Learning",
    "nlp": "Machine Learning",
    "computer vision": "Machine Learning",
    "deep learning": "Machine Learning",
    "neural networks": "Machine Learning",
    # Data
    "pandas": "Data Science",
    "numpy": "Data Science",
    "matplotlib": "Data Science",
    "seaborn": "Data Science",
    "sql": "Data Engineering",
    "postgresql": "Data Engineering",
    "mysql": "Data Engineering",
    "mongodb": "Data Engineering",
    "redis": "Data Engineering",
    "spark": "Data Engineering",
    "hadoop": "Data Engineering",
    "kafka": "Data Engineering",
    # Cloud/DevOps
    "aws": "Cloud & DevOps",
    "azure": "Cloud & DevOps",
    "gcp": "Cloud & DevOps",
    "google cloud": "Cloud & DevOps",
    "docker": "Cloud & DevOps",
    "kubernetes": "Cloud & DevOps",
    "terraform": "Cloud & DevOps",
    "ci/cd": "Cloud & DevOps",
    "jenkins": "Cloud & DevOps",
    "github actions": "Cloud & DevOps",
    # Languages
    "python": "Python",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "java": "Java",
    "jvm": "Java",
    "c++": "C/C++",
    "c#": "C#",
    ".net": "C#",
    "go": "Go",
    "golang": "Go",
    "rust": "Rust",
    "scala": "Scala",
    "r": "R",
    "ruby": "Ruby",
    "php": "PHP",
}


def normalize_skills(skills: list[str]) -> list[str]:
    """Return skills with semantic normalization applied (deduped)."""
    normalized = set()
    for skill in skills:
        lower = skill.lower().strip()
        mapped = SKILL_HIERARCHY.get(lower)
        if mapped:
            normalized.add(mapped)
        normalized.add(skill)  # Keep original as well
    return sorted(list(normalized))


def compute_weighted_score(ai_score: dict) -> float:
    """
    Compute weighted final score from AI sub-scores.
    Weights: experience 35%, skills 30%, domain 20%, education 15%
    """
    weights = {
        "experience_match_score": 0.35,
        "skills_match_score": 0.30,
        "domain_fit_score": 0.20,
        "education_match_score": 0.15,
    }
    total = 0.0
    for key, weight in weights.items():
        val = ai_score.get(key, 0) or 0
        total += float(val) * weight
    return round(total, 2)
