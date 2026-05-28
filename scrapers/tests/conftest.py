import pytest
import os
from src.helpers import html_to_json

MOCK_DATA_DIR = os.path.join(os.path.dirname(__file__), "mock_data")

def load_mock_html(filename):
    path = os.path.join(MOCK_DATA_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

@pytest.fixture
def pracuj_pl_main_data():
    html = load_mock_html("pracuj_pl_main.html")
    return html_to_json(html)

@pytest.fixture
def pracuj_pl_offer_data():
    html = load_mock_html("pracuj_pl_offer.html")
    return html_to_json(html)

@pytest.fixture
def theprotocol_main_data():
    html = load_mock_html("theprotocol_main.html")
    return html_to_json(html)

@pytest.fixture
def theprotocol_offer_data():
    html = load_mock_html("theprotocol_offer.html")
    return html_to_json(html)
