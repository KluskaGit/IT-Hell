import pytest
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
from unittest.mock import AsyncMock
from uuid import uuid4

from src.api.v1.routers.users import router as users_router
from src.api.v1.deps import get_current_user, get_user_profile_service
from src.models.users import User, UserProfile
from src.models.lookups import ExperienceLevel


@pytest.fixture
def mock_user_profile_service():
    return AsyncMock()


@pytest.fixture
def mock_current_user():
    return User(
        id_keycloak=uuid4(),
        email="test_router@example.com",
        first_name="Alice",
        last_name="Smith"
    )


@pytest.fixture
def app_instance(mock_user_profile_service, mock_current_user):
    app = FastAPI()
    app.include_router(users_router)
    app.dependency_overrides[get_user_profile_service] = lambda: mock_user_profile_service
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    return app


@pytest.mark.asyncio
async def test_get_me(app_instance, mock_current_user):
    async with AsyncClient(transport=ASGITransport(app=app_instance), base_url="http://test") as client:
        response = await client.get("/users/me")

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test_router@example.com"
    assert data["first_name"] == "Alice"


@pytest.mark.asyncio
async def test_get_my_profile(app_instance, mock_user_profile_service, mock_current_user):
    exp_id = uuid4()
    mock_profile = UserProfile(
        user_id=mock_current_user.id_keycloak, 
        raw_cv="My CV from router",
        exp_level_id=exp_id
    )
    mock_profile.id = uuid4()  
    mock_profile.exp_level = ExperienceLevel(id=exp_id, name="Junior")
    mock_profile.technologies = []
    
    mock_user_profile_service.get_profile.return_value = mock_profile

    async with AsyncClient(transport=ASGITransport(app=app_instance), base_url="http://test") as client:
        response = await client.get("/users/me/profile")

    assert response.status_code == 200
    assert response.json()["raw_cv"] == "My CV from router"
    assert response.json()["exp_level"]["name"] == "Junior"


@pytest.mark.asyncio
async def test_update_my_profile(app_instance, mock_user_profile_service, mock_current_user):
    exp_id = uuid4()
    mock_profile = UserProfile(
        user_id=mock_current_user.id_keycloak, 
        raw_cv="Updated CV from router",
        exp_level_id=exp_id
    )
    mock_profile.id = uuid4()
    mock_profile.exp_level = ExperienceLevel(id=exp_id, name="Mid")
    mock_profile.technologies = []
    
    mock_user_profile_service.update_profile.return_value = mock_profile

    async with AsyncClient(transport=ASGITransport(app=app_instance), base_url="http://test") as client:
        response = await client.put("/users/me/profile", json={"raw_cv": "Updated CV from router"})

    assert response.status_code == 200
    assert response.json()["raw_cv"] == "Updated CV from router"