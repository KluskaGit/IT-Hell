import json

from typing import Dict, List
from bs4 import BeautifulSoup


def extract_query(next_data: Dict, search_queries: set[str]) -> Dict:
    try:
        queries = next_data["props"]["pageProps"]["dehydratedState"]["queries"]
    except KeyError as e:
        raise ValueError(f"Invalid next_data structure, {e}")
    
    results = {}
    for query in queries:
        query_hash = query.get("queryKey")
        if query_hash and isinstance(query_hash, List):
            if match_query := next((x for x in query_hash if type(x) is str and x in search_queries), None):
                results[match_query] = query.get("state", {}).get("data", {})
    
    return results

def html_to_json(text: str) -> Dict | None:
    try:
        html = text
        soup = BeautifulSoup(html, 'html.parser')
        next_data_script = soup.find('script', id='__NEXT_DATA__')
        if next_data_script:
            return json.loads(next_data_script.string) # type: ignore
        return None
    
    except Exception as e:
        raise



