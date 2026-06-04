import pytest
from unittest.mock import AsyncMock
from uuid import uuid4

from src.services.user_profiles_service import UserProfileService
from src.core.exceptions import RecordNotFoundError
from src.schemas.users import UserProfileUpdate
from src.models.users import UserProfile
from src.models.lookups import Technology


@pytest.mark.asyncio
async def test_get_profile_success():
    mock_repo = AsyncMock()
    mock_lookups = AsyncMock()
    service = UserProfileService(repo=mock_repo, lookups_service=mock_lookups)
    
    user_id = uuid4()
    mock_repo.get_profile_by_user_id.return_value = UserProfile(user_id=user_id, raw_cv="My CV Text")
    
    result = await service.get_profile(user_id)
    
    assert result.user_id == user_id
    assert result.raw_cv == "My CV Text"
    mock_repo.get_profile_by_user_id.assert_called_once_with(user_id)


@pytest.mark.asyncio
async def test_get_profile_not_found():
    mock_repo = AsyncMock()
    service = UserProfileService(repo=mock_repo, lookups_service=AsyncMock())
    
    mock_repo.get_profile_by_user_id.return_value = None
    
    with pytest.raises(RecordNotFoundError, match="User profile not found"):
        await service.get_profile(uuid4())


@pytest.mark.asyncio
async def test_update_profile_existing():
    # Test dla przypadku gdy profil już istnieje
    mock_repo = AsyncMock()
    mock_lookups = AsyncMock()
    service = UserProfileService(repo=mock_repo, lookups_service=mock_lookups)
    
    user_id = uuid4()
    tech_id = uuid4()
    exp_level_id = uuid4()
    
    # Symulujemy dane przychodzące od klienta (przez Pydantic)
    profile_data = UserProfileUpdate(
        raw_cv="Updated CV text",
        exp_level_id=exp_level_id,
        technology_ids=[tech_id]
    )
    
    # Repo mówi, że użytkownik ma już profil
    mock_repo.get_profile_by_user_id.return_value = UserProfile(user_id=user_id)
    
    # Mockujemy zwrócenie technologii po ID
    mock_tech = Technology(id=tech_id, name="Python")
    mock_lookups.get_by_id.return_value = mock_tech
    
    # Mock repo dla udanej aktualizacji
    mock_repo.update_profile.return_value = UserProfile(user_id=user_id, raw_cv="Updated CV text")
    
    # Wykonanie
    result = await service.update_profile(user_id, profile_data)
    
    # Sprawdzenia
    assert result.raw_cv == "Updated CV text"
    mock_lookups.get_by_id.assert_called_once_with(Technology, str(tech_id))
    mock_repo.update_profile.assert_called_once_with(
        user_id=user_id,
        raw_cv="Updated CV text",
        exp_level_id=exp_level_id,
        technologies=[mock_tech]
    )
    # Skoro profil istniał, metoda create_profile nie powinna zostać wywołana
    mock_repo.create_profile.assert_not_called()


@pytest.mark.asyncio
async def test_update_profile_upsert():
    # Test dla przypadku UPSERT, czyli tworzenie profilu gdy wcześniej nie istniał
    mock_repo = AsyncMock()
    mock_lookups = AsyncMock()
    service = UserProfileService(repo=mock_repo, lookups_service=mock_lookups)
    
    user_id = uuid4()
    profile_data = UserProfileUpdate(
        raw_cv="New User CV",
        exp_level_id=None,
        technology_ids=None  # Brak technologii - to też warto przetestować
    )
    
    # Repo mówi, że użytkownik NIE MA profilu
    mock_repo.get_profile_by_user_id.return_value = None
    
    # Mock repo dla pomyślnego utworzenia
    mock_repo.create_profile.return_value = UserProfile(user_id=user_id, raw_cv="New User CV")
    
    result = await service.update_profile(user_id, profile_data)
    
    assert result.raw_cv == "New User CV"
    mock_repo.create_profile.assert_called_once_with(
        user_id=user_id,
        raw_cv="New User CV",
        exp_level_id=None,
        technologies=[]
    )
    # Ponieważ korzystamy ze ścieżki UPSERT, update_profile na repo nie powinno się wykonać
    mock_repo.update_profile.assert_not_called()