import pytest
from src.helpers import html_to_json, extract_query

def test_html_to_json_valid():
    html = '<html><body><script id="__NEXT_DATA__" type="application/json">{"foo": "bar"}</script></body></html>'
    result = html_to_json(html)
    assert result == {"foo": "bar"}

def test_html_to_json_missing_script():
    html = '<html><body></body></html>'
    result = html_to_json(html)
    assert result is None

def test_extract_query():
    next_data = {
        "props": {
            "pageProps": {
                "dehydratedState": {
                    "queries": [
                        {
                            "queryKey": ["someHash", "jobOffers"],
                            "state": {"data": {"offers": [1, 2]}}
                        },
                        {
                            "queryKey": ["otherHash"],
                            "state": {"data": {"val": 42}}
                        }
                    ]
                }
            }
        }
    }
    
    result = extract_query(next_data, {"jobOffers"})
    assert "jobOffers" in result
    assert result["jobOffers"] == {"offers": [1, 2]}
    assert "otherHash" not in result

def test_extract_query_invalid_structure():
    with pytest.raises(ValueError, match="Invalid next_data structure"):
        extract_query({}, {"jobOffers"})
