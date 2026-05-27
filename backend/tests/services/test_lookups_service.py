import pytest
from unittest.mock import AsyncMock
from uuid import uuid4

from src.services.lookups_service import LookupsService
from src.core.exceptions import RecordNotFoundError
from src.models.lookups import Technology, Company


@pytest.mark.asyncio
async def test_get_by_name_success():
    mock_repo = AsyncMock()
    service = LookupsService(repo=mock_repo)

    expected_tech = Technology(id=uuid4(), name="Python")
    mock_repo.get_by_name.return_value = expected_tech

    # Testujemy uniwersalną metodę przyjmującą klasę modelu i nazwę
    result = await service.get_by_name(Technology, "Python")

    assert result.name == "Python"
    mock_repo.get_by_name.assert_called_once_with(Technology, "Python")


@pytest.mark.asyncio
async def test_get_by_name_not_found():
    mock_repo = AsyncMock()
    service = LookupsService(repo=mock_repo)

    mock_repo.get_by_name.return_value = None

    with pytest.raises(RecordNotFoundError):
        await service.get_by_name(Company, "UnknownCompany")


@pytest.mark.asyncio
async def test_add_success():
    mock_repo = AsyncMock()
    service = LookupsService(repo=mock_repo)

    # Uczymy mocka, aby zasymulował brak rekordu o takiej nazwie w bazie (żeby test przeszedł dalej)
    mock_repo.get_by_name.return_value = None

    # Symulujemy, że repozytorium zapisuje i zwraca nowy obiekt
    new_id = uuid4()
    mock_repo.add.return_value = Company(id=new_id, name="New IT Corp")

    result = await service.add(Company, "New IT Corp")

    assert result.id == new_id
    assert result.name == "New IT Corp"
    mock_repo.add.assert_called_once_with(Company, "New IT Corp")