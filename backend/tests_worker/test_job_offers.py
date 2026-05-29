import pytest
from unittest.mock import patch, AsyncMock
from contextlib import asynccontextmanager
from worker.job_offers import save_job_offer_to_db
from src.core.exceptions import DiscardException

@pytest.mark.asyncio
async def test_save_job_offer_to_db_success():
    payload = {
        "site": "TestSite",
        "title": "Software Engineer",
        "technologies": ["Python"],
        "specialization": "Backend",
        "company": "TestComp",
        "exp_lvl": "Junior",
        "work_type": "Remote",
        "url": "http://example.com",
        "locations": ["Warsaw"],
        "description": "Description text",
        "salary_from": 1000,
        "salary_to": 2000
    }
    
    mock_service = AsyncMock()
    
    @asynccontextmanager
    async def mock_get_service():
        yield mock_service
        
    with patch("worker.job_offers.get_job_offers_service", return_value=mock_get_service()):
        await save_job_offer_to_db(payload)
        
    mock_service.create_from_scraper.assert_called_once()
    # Check if normalize_offer was called implicitly and modified data (Remote -> Zdalna)
    called_offer = mock_service.create_from_scraper.call_args[0][0]
    assert called_offer.work_type_name == "Zdalna"

@pytest.mark.asyncio
async def test_save_job_offer_to_db_missing_key():
    payload = {"site": "OnlySite"}
    
    with pytest.raises(KeyError, match="Missing required field"):
        await save_job_offer_to_db(payload)

@pytest.mark.asyncio
async def test_save_job_offer_to_db_discard_exception():
    payload = {
        "site": "TestSite",
        "title": "Software Engineer",
        "technologies": ["Python"],
        "specialization": "Backend",
        "company": "TestComp",
        "exp_lvl": "Junior",
        "work_type": "Remote",
        "url": "http://example.com",
        "locations": ["Warsaw"],
        "description": "Description text"
    }
    
    mock_service = AsyncMock()
    mock_service.create_from_scraper.side_effect = DiscardException("Test discard")
    
    @asynccontextmanager
    async def mock_get_service():
        yield mock_service
        
    with patch("worker.job_offers.get_job_offers_service", return_value=mock_get_service()):
        # Should not raise exception, just print and return
        await save_job_offer_to_db(payload)
    
    mock_service.create_from_scraper.assert_called_once()
