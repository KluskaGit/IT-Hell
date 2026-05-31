import pytest
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
from unittest.mock import AsyncMock
from uuid import uuid4

from src.api.v1.routers.lookups import router as lookups_router
from src.api.v1.deps import get_lookups_service, get_optional_current_user
from src.models.lookups import Technology, Site
from src.models.users import User
from src.core.exceptions import RecordNotFoundError


@pytest.fixture
def mock_lookups_service():
    return AsyncMock()


@pytest.fixture
def app_instance(mock_lookups_service):
    app = FastAPI()
    app.include_router(lookups_router)
    app.dependency_overrides[get_lookups_service] = lambda: mock_lookups_service
    return app


@pytest.mark.asyncio
async def test_get_technologies(app_instance, mock_lookups_service):
    tech_id = uuid4()
    mock_lookups_service.get_all.return_value = [Technology(id=tech_id, name="Python")]

    async with AsyncClient(transport=ASGITransport(app=app_instance), base_url="http://test") as client:
        response = await client.get("/lookups/technologies")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Python"
    assert data[0]["id"] == str(tech_id)
    mock_lookups_service.get_all.assert_called_once()


@pytest.mark.asyncio
async def test_get_sites_authenticated(app_instance, mock_lookups_service):
    mock_user = User(id_keycloak=uuid4(), email="test@example.com")
    app_instance.dependency_overrides[get_optional_current_user] = lambda: mock_user

    site_id = uuid4()
    mock_lookups_service.get_all.return_value = [Site(id=site_id, name="JustJoinIT")]

    async with AsyncClient(transport=ASGITransport(app=app_instance), base_url="http://test") as client:
        response = await client.get("/lookups/sites")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    mock_lookups_service.get_all.assert_called_once()


@pytest.mark.asyncio
async def test_get_sites_anonymous(app_instance, mock_lookups_service):
    app_instance.dependency_overrides[get_optional_current_user] = lambda: None

    site_id = uuid4()
    mock_lookups_service.get_by_name.return_value = Site(id=site_id, name="LimitedSite")

    async with AsyncClient(transport=ASGITransport(app=app_instance), base_url="http://test") as client:
        response = await client.get("/lookups/sites")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "LimitedSite"


@pytest.mark.asyncio
async def test_get_sites_anonymous_fallback(app_instance, mock_lookups_service):
    app_instance.dependency_overrides[get_optional_current_user] = lambda: None

    mock_lookups_service.get_by_name.side_effect = RecordNotFoundError("Not found")
    mock_lookups_service.get_all.return_value = [Site(id=uuid4(), name="FallbackSite")]

    async with AsyncClient(transport=ASGITransport(app=app_instance), base_url="http://test") as client:
        response = await client.get("/lookups/sites")

    assert response.status_code == 200
    data = response.json()
    assert data[0]["name"] == "FallbackSite"