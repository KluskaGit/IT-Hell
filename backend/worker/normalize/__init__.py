import re

def normalize_string(to_normalize: str, map: dict[str, str]) -> str:
    for regex, value in map.items():
        if re.search(regex, to_normalize, flags=re.IGNORECASE):
            return value.strip()
    return to_normalize.strip()

def normalize_strings(to_normalize: list[str], map: dict[str, str]) -> list[str]:
    normalized: list[str] = []

    for raw in to_normalize:
        #skill = raw
        for regex, value in map.items():
            if re.search(regex, raw, flags=re.IGNORECASE):
               #skill = value
               raw = value
               break
        normalized.append(raw.strip())
    
    return list(set(normalized))