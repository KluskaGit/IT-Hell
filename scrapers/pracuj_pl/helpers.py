from typing import Dict, List


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



