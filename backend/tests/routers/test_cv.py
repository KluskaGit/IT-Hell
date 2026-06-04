import pytest
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
from unittest.mock import AsyncMock
from uuid import uuid4

from src.api.v1.routers.cv import router as cv_router
from src.api.v1.deps import get_cv_service
from src.models.lookups import Technology


@pytest.fixture
def mock_cv_service():
    return AsyncMock()


@pytest.fixture
async def client(mock_cv_service):
    app = FastAPI()
    app.include_router(cv_router)
    
    app.dependency_overrides[get_cv_service] = lambda: mock_cv_service
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_upload_cv_success(client: AsyncClient, mock_cv_service: AsyncMock):
    tech_id = uuid4()
    mock_cv_service.extract_technologies_from_file.return_value = [
        Technology(id=tech_id, name="Python")
    ]

    files = {"file": ("resume.pdf", b"fake file content", "application/pdf")}
    response = await client.post("/cv/upload", files=files)

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == str(tech_id)
    assert data[0]["name"] == "Python"


@pytest.mark.asyncio
async def test_upload_cv_validation_error(client: AsyncClient, mock_cv_service: AsyncMock):
    mock_cv_service.extract_technologies_from_file.side_effect = ValueError("Supported formats are only PDF and DOCX.")
    files = {"file": ("resume.txt", b"dummy content", "text/plain")}
    response = await client.post("/cv/upload", files=files)
    assert response.status_code == 422
    assert response.json()["detail"] == "Supported formats are only PDF and DOCX."


@pytest.mark.asyncio
async def test_upload_cv_internal_error(client: AsyncClient, mock_cv_service: AsyncMock):
    mock_cv_service.extract_technologies_from_file.side_effect = Exception("Unexpected crash")
    response = await client.post("/cv/upload", files={"file": ("r.pdf", b"", "application/pdf")})
    assert response.status_code == 500
