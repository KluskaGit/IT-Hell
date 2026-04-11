from typing import Dict
from pracuj_pl.helpers import extract_query

QUERIES = {"workModes", "itSpecializations", "itTechnologies", "positionLevels"}
DATA_PATH = "pracuj_pl/data"


def extract_lookups(next_data: Dict) -> Dict:
    raw_lookups = extract_query(next_data, QUERIES)

    result = {}

    for key, values in raw_lookups.items():
        names = []
        for value in values:
            names.append(value.get("name"))

        result[key] = names

    return result