
import json

from typing import Dict
from pracuj_pl.helpers import extract_query
from pracuj_pl.main import DATA_PATH

QUERIES = {"workModes", "itSpecializations", "itTechnologies", "positionLevels"}
DATA_PATH = "pracuj_pl/data"
def get_next_data() -> Dict:
    with open(f"{DATA_PATH}/next_data.json", "r") as f:
        data = f.read()
        next_data = json.loads(data)

    return next_data

next_data = get_next_data()


def extract_lookups(next_data: Dict) -> Dict:
    raw_lookups = extract_query(next_data, QUERIES)

    result = {}

    for key, values in raw_lookups.items():
        names = []
        for value in values:
            names.append(value.get("name"))

        result[key] = names

    return result

print(extract_lookups(next_data))
