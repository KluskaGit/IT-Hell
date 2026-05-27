import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.lookups import LookupsRepository
from src.models.lookups import Technology, Company


@pytest.mark.asyncio
async def test_add_and_get_by_id(db_session: AsyncSession):
    repo = LookupsRepository(session=db_session)
    
    # Testujemy metodę add
    added_tech = await repo.add(Technology, "Python")
    assert added_tech.id is not None
    assert added_tech.name == "Python"
    
    # Testujemy metodę get_by_id
    fetched_tech = await repo.get_by_id(Technology, str(added_tech.id))
    assert fetched_tech is not None
    assert fetched_tech.id == added_tech.id
    assert fetched_tech.name == "Python"


@pytest.mark.asyncio
async def test_get_all_and_get_by_name(db_session: AsyncSession):
    repo = LookupsRepository(session=db_session)
    
    # Dodajemy kilka rekordów
    await repo.add(Technology, "Java")
    await repo.add(Technology, "Rust")
    await repo.add(Technology, "Go")
    
    # Testujemy get_all
    all_techs = await repo.get_all(Technology)
    # Musimy upewnić się, że pobrano co najmniej 3, bo testy korzystają z tej samej 
    # bazy, chyba że w conftest.py każdorazowo ją czyścisz. Zakładamy >= 3
    assert len(all_techs) >= 3
    names = [t.name for t in all_techs]
    assert "Java" in names
    assert "Rust" in names
    
    # Testujemy get_by_name
    go_tech = await repo.get_by_name(Technology, "Go")
    assert go_tech is not None
    assert go_tech.name == "Go"


@pytest.mark.asyncio
async def test_update_and_delete(db_session: AsyncSession):
    repo = LookupsRepository(session=db_session)
    
    # Z użyciem innej klasy (Company) by udowodnić uniwersalność repozytorium
    company = await repo.add(Company, "Old Company Name")
    
    # Testujemy update
    updated_company = await repo.update(Company, str(company.id), "New Company Name")
    assert updated_company is not None
    assert updated_company.name == "New Company Name"
    
    # Testujemy delete
    is_deleted = await repo.delete(Company, str(company.id))
    assert is_deleted is True
    
    # Upewniamy się, że rekordu już nie ma
    fetched_company = await repo.get_by_id(Company, str(company.id))
    assert fetched_company is None