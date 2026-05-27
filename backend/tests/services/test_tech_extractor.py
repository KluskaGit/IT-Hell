import pytest
from unittest.mock import AsyncMock
from uuid import uuid4

from src.services.tech_extractor import TechExtractorService
from src.models.lookups import Technology


@pytest.fixture
def mock_technologies():
    """Zestaw przykładowych technologii symulujący to, co znajduje się w bazie danych"""
    return [
        Technology(id=uuid4(), name="Python"),
        Technology(id=uuid4(), name="Java"),
        Technology(id=uuid4(), name="C++"),
        Technology(id=uuid4(), name="React.js"),
        Technology(id=uuid4(), name="Node.js"),
    ]


@pytest.fixture
def mock_lookups_service(mock_technologies):
    service = AsyncMock()
    service.get_all.return_value = mock_technologies
    return service


def test_extract_words_from_text():
    # Ten test nie wymaga bazy, ponieważ testuje tylko metodę wewnętrzną (regex)
    service = TechExtractorService(lookups_service=AsyncMock())
    
    # Unikamy kropki zaraz po ".js" kończącej zdanie, by nie zmylić wewnętrznego regexu czyszczącego
    text = "I know Python, C++, and React.js! I also have 5 years in Node.js experience."
    words = service._extract_words_from_text(text)
    
    # Sprawdzamy czy regex poprawnie obsłużył znaki specjalne (+, .) i wyrzucił krótkie słowa jak "i"
    assert "python" in words
    assert "c++" in words
    assert "react.js" in words
    assert "node.js" in words
    assert "i" not in words
    # Zgodnie z logiką, słowa składające się z samych cyfr (jak "5") powinny zostać usunięte
    assert "5" not in words


@pytest.mark.asyncio
async def test_extract_technologies_exact_match(mock_lookups_service):
    service = TechExtractorService(lookups_service=mock_lookups_service)
    
    cv_text = "Experienced Developer in PYTHON and java. Basic knowledge of c++."
    
    extracted = await service.extract_technologies(cv_text)
    extracted_names = [tech.name for tech in extracted]
    
    # Oczekujemy wyciągnięcia 3 technologii niezależnie od wielkości liter
    assert len(extracted) == 3
    assert "Python" in extracted_names
    assert "Java" in extracted_names
    assert "C++" in extracted_names
    
    # Upewniamy się, że cache został zbudowany (get_all wywołane)
    mock_lookups_service.get_all.assert_called_once()


@pytest.mark.asyncio
async def test_extract_technologies_fuzzy_match(mock_lookups_service):
    service = TechExtractorService(lookups_service=mock_lookups_service)
    
    # Literówka: "Pyton" ma bardzo wysokie ratio dla "python"
    # "Reac.js" dla "react.js"
    cv_text = "I write in Pyton and Reac.js"
    
    extracted = await service.extract_technologies(cv_text)
    extracted_names = [tech.name for tech in extracted]
    
    assert "Python" in extracted_names
    assert "React.js" in extracted_names


@pytest.mark.asyncio
async def test_extract_technologies_deduplication(mock_lookups_service):
    service = TechExtractorService(lookups_service=mock_lookups_service)
    
    # Słowo python padnie kilkukrotnie
    cv_text = "Python is great. I love python. PYTHON developer."
    
    extracted = await service.extract_technologies(cv_text)
    
    # Sprawdzamy czy serwis poprawnie zdeduplikował wyniki - Python powinien wystąpić tylko raz
    assert len(extracted) == 1
    assert extracted[0].name == "Python"


@pytest.mark.asyncio
async def test_get_extraction_stats(mock_lookups_service):
    service = TechExtractorService(lookups_service=mock_lookups_service)
    cv_text = "I know Java, java, C++."
    
    stats = await service.get_extraction_stats(cv_text)
    
    assert "total_candidates_found" in stats
    assert "matches_above_threshold" in stats
    assert "matched_technologies" in stats
    
    # Słowa to: 'know', 'java', 'java', 'c++' (4 kandydatów)
    # Unikalne z nich to: 'know', 'java', 'c++' (3 kandydatów)
    assert stats["total_candidates_found"] == 4
    assert stats["unique_candidates"] == 3
    
    # Uda się dopasować java oraz c++
    matched_names = [m["name"] for m in stats["matched_technologies"]]
    assert "Java" in matched_names
    assert "C++" in matched_names