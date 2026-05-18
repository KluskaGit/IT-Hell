import re

EXPERIENCE_LEVELS = {
    r'intern|stażysta|stażystka|trainee': "Intern",
    r'assistant|asystent': "Asystent/Asystentka",
    r'junior': "Junior",
    r'mid|regular': "Mid",
    r'senior': "Senior",
    r'expert|ekspert': "Expert",
    r'lead|kierownik|kierowniczka': "Lead",
    r'manager|menedżer': "Menadżer/Menadżerka",
    r'head|prezes|dyrektor': "Head"
}

def normalize_experience(exp: str) -> str:
    for regex, value in EXPERIENCE_LEVELS.items():
        if re.search(regex, exp, flags=re.IGNORECASE):
            return value
    return exp
