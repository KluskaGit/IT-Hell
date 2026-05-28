import pytest
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.users import UserRepository, UserProfileRepository
from src.schemas.users import UserCreate
from src.models.lookups import Technology, ExperienceLevel


@pytest.mark.asyncio
async def test_create_and_get_user(db_session: AsyncSession):
    repo = UserRepository(session=db_session)
    
    # Przygotowanie danych z Pydantica
    user_data = UserCreate(
        id_keycloak=uuid4(),
        email="test@example.com",
        first_name="John",
        last_name="Doe"
    )
    
    # Test tworzenia użytkownika
    created_user = await repo.create_user(user_data)
    assert created_user.email == "test@example.com"
    assert created_user.first_name == "John"
    assert created_user.id_keycloak == user_data.id_keycloak
    
    # Test pobierania po emailu
    fetched_user = await repo.get_user_by_email("test@example.com")
    assert fetched_user is not None
    assert fetched_user.id_keycloak == user_data.id_keycloak


@pytest.mark.asyncio
async def test_user_profile_crud(db_session: AsyncSession):
    user_repo = UserRepository(session=db_session)
    profile_repo = UserProfileRepository(session=db_session)
    
    # 1. Tworzymy najpierw użytkownika (żeby spełnić ewentualne więzy klucza obcego)
    user_id = uuid4()
    await user_repo.create_user(UserCreate(
        id_keycloak=user_id, email="profile@example.com", first_name="Jane", last_name="Doe"
    ))
    
    # 2. Przygotowujemy dane słownikowe w bazie do relacji z profilem
    tech = Technology(id=uuid4(), name="Docker")
    exp = ExperienceLevel(id=uuid4(), name="Senior")
    db_session.add_all([tech, exp])
    await db_session.commit()
    
    # 3. Test tworzenia profilu z relacjami
    created_profile = await profile_repo.create_profile(
        user_id=user_id,
        raw_cv="My super resume",
        exp_level_id=exp.id,
        technologies=[tech]
    )
    assert created_profile.user_id == user_id
    assert created_profile.raw_cv == "My super resume"
    assert len(created_profile.technologies) == 1
    
    # 4. Test pobierania profilu (sprawdzenie czy selectinload ładuje relacje)
    fetched_profile = await profile_repo.get_profile_by_user_id(user_id)
    assert fetched_profile is not None
    assert fetched_profile.exp_level is not None
    assert fetched_profile.exp_level.name == "Senior"
    assert fetched_profile.technologies[0].name == "Docker"
    
    # 5. Test aktualizacji (zmiana CV i wyczyszczenie technologii)
    updated_profile = await profile_repo.update_profile(
        user_id=user_id,
        raw_cv="Updated resume",
        technologies=[]
    )
    
    assert updated_profile is not None
    assert updated_profile.raw_cv == "Updated resume"