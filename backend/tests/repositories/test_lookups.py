import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.lookups import LookupsRepository
from src.models.lookups import Technology, Company


@pytest.mark.asyncio
async def test_add_and_get_by_id(db_session: AsyncSession):
    repo = LookupsRepository(session=db_session)
    
    added_tech = await repo.add(Technology, "Python")
    assert added_tech.id is not None
    assert added_tech.name == "Python"
    
    fetched_tech = await repo.get_by_id(Technology, added_tech.id)#type: ignore
    assert fetched_tech is not None
    assert fetched_tech.id == added_tech.id
    assert fetched_tech.name == "Python"


@pytest.mark.asyncio
async def test_get_all_and_get_by_name(db_session: AsyncSession):
    repo = LookupsRepository(session=db_session)
    
    await repo.add(Technology, "Java")
    await repo.add(Technology, "Rust")
    await repo.add(Technology, "Go")
    
    all_techs = await repo.get_all(Technology)
    assert len(all_techs) >= 3
    names = [t.name for t in all_techs]
    assert "Java" in names
    assert "Rust" in names
    
    go_tech = await repo.get_by_name(Technology, "Go")
    assert go_tech is not None
    assert go_tech.name == "Go"


@pytest.mark.asyncio
async def test_update_and_delete(db_session: AsyncSession):
    repo = LookupsRepository(session=db_session)
    
    company = await repo.add(Company, "Old Company Name")
    
    updated_company = await repo.update(Company, company.id, "New Company Name")#type: ignore
    assert updated_company is not None
    assert updated_company.name == "New Company Name"
    
    is_deleted = await repo.delete(Company, company.id)#type: ignore
    assert is_deleted is True
    
    fetched_company = await repo.get_by_id(Company, company.id) #type: ignore
    assert fetched_company is None