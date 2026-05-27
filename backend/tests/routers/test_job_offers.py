import pytest
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
from unittest.mock import AsyncMock
from uuid import uuid4

from src.api.v1.routers.job_offers import router as job_offers_router
from src.api.v1.deps import get_job_offers_service, get_lookups_service, get_optional_current_user
from src.models.lookups import Site
from src.models.job_offers import JobOffer
from src.models.users import User
from src.core.exceptions import RecordNotFoundError


@pytest.fixture
def mock_job_offers_service():
    return AsyncMock()


@pytest.fixture
def mock_lookups_service():
    return AsyncMock()


@pytest.fixture
def app_instance(mock_job_offers_service, mock_lookups_service):
    # Tworzymy aplikację specjalnie dla tych testów i nadpisujemy główne serwisy
    app = FastAPI()
    app.include_router(job_offers_router)
    app.dependency_overrides[get_job_offers_service] = lambda: mock_job_offers_service
    app.dependency_overrides[get_lookups_service] = lambda: mock_lookups_service
    return app


@pytest.mark.asyncio
async def test_get_job_offers_authenticated(app_instance, mock_job_offers_service):
    # Symulacja zalogowanego użytkownika
    mock_user = User(id_keycloak=uuid4(), email="test@example.com")
    app_instance.dependency_overrides[get_optional_current_user] = lambda: mock_user
    
    # Symulacja danych z serwisu
    offer_id = uuid4()
    mock_job_offers_service.filter.return_value = [
        JobOffer(id=offer_id, title="Python Dev", url="http://test.com", description="Desc")
    ]

    async with AsyncClient(transport=ASGITransport(app=app_instance), base_url="http://test") as client:
        response = await client.get("/job-offers/get_offer_filter?title=Python")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Python Dev"
    
    # Sprawdzamy, czy filtry trafiły do serwisu bez sztucznych ograniczeń (brak site_ids)
    call_kwargs = mock_job_offers_service.filter.call_args.kwargs
    assert call_kwargs.get("title") == "Python"
    assert call_kwargs.get("site_ids") is None


@pytest.mark.asyncio
async def test_get_job_offers_anonymous_site_exists(app_instance, mock_job_offers_service, mock_lookups_service):
    # Symulacja anonimowego użytkownika (brak autoryzacji)
    app_instance.dependency_overrides[get_optional_current_user] = lambda: None
    
    site_id = uuid4()
    mock_lookups_service.get_by_name.return_value = Site(id=site_id, name="TestSite")
    mock_job_offers_service.filter.return_value = []

    async with AsyncClient(transport=ASGITransport(app=app_instance), base_url="http://test") as client:
        response = await client.get("/job-offers/get_offer_filter")

    assert response.status_code == 200
    
    # Oczekujemy, że logika routera podmieniła w locie site_ids
    call_kwargs = mock_job_offers_service.filter.call_args.kwargs
    assert call_kwargs.get("site_ids") == [site_id]


@pytest.mark.asyncio
async def test_get_job_offers_anonymous_no_sites(app_instance, mock_job_offers_service, mock_lookups_service):
    app_instance.dependency_overrides[get_optional_current_user] = lambda: None
    
    # Zmuszamy lookups_service by wyrzucił brak wyników dla obu zapytań (by nazwa oraz get_all)
    mock_lookups_service.get_by_name.side_effect = RecordNotFoundError("Site not found")
    mock_lookups_service.get_all.return_value = []

    async with AsyncClient(transport=ASGITransport(app=app_instance), base_url="http://test") as client:
        response = await client.get("/job-offers/get_offer_filter")

    assert response.status_code == 200
    # Jeśli brak jest portali, router ma szybko oddać pustą listę `[]`
    assert response.json() == []
    
    # Zabezpieczenie – silnik wyszukiwania nigdy nie powinien zostać obciążony
    mock_job_offers_service.filter.assert_not_called()