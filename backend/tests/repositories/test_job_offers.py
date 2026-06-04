import pytest
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.job_offers import JobOffersRepository
from src.models.lookups import Technology, Location


@pytest.mark.asyncio
async def test_create_and_get_job_offer(db_session: AsyncSession):
    repo = JobOffersRepository(session=db_session)
    
    site_id = uuid4()
    exp_level_id = uuid4()
    company_id = uuid4()
    work_type_id = uuid4()
    specialization_id = uuid4()

    created_offer = await repo.create(
        site_id=site_id,
        exp_level_id=exp_level_id,
        company_id=company_id,
        work_type_id=work_type_id,
        specialization_id=specialization_id,
        url="https://example.com/job",
        title="Backend Developer",
        description="Super job"
    )

    assert created_offer.title == "Backend Developer"
    assert created_offer.id is not None

    fetched_offer = await repo.get_by_url("https://example.com/job")
    assert fetched_offer is not None
    assert fetched_offer.id == created_offer.id


@pytest.mark.asyncio
async def test_filter_job_offers(db_session: AsyncSession):
    repo = JobOffersRepository(session=db_session)
    
    site_id = uuid4()
    
    await repo.create(
        site_id=site_id, exp_level_id=uuid4(), company_id=uuid4(), work_type_id=uuid4(), specialization_id=uuid4(),
        url="url1", title="Python Developer", description="Mid level", salary_from=10000, salary_to=15000
    )
    await repo.create(
        site_id=site_id, exp_level_id=uuid4(), company_id=uuid4(), work_type_id=uuid4(), specialization_id=uuid4(),
        url="url2", title="Java Developer", description="Mid level", salary_from=8000, salary_to=12000
    )
    await repo.create(
        site_id=site_id, exp_level_id=uuid4(), company_id=uuid4(), work_type_id=uuid4(), specialization_id=uuid4(),
        url="url3", title="Senior Python Dev", description="Senior", salary_from=16000, salary_to=20000
    )

    python_offers = await repo.filter(title="python")
    assert len(python_offers) == 2

    high_salary = await repo.filter(salary_from_min=15000)
    assert len(high_salary) == 1
    assert high_salary[0].title == "Senior Python Dev"

    low_salary = await repo.filter(salary_to_max=13000)
    assert len(low_salary) == 1
    assert low_salary[0].title == "Java Developer"


@pytest.mark.asyncio
async def test_create_with_relationships(db_session: AsyncSession):
    repo = JobOffersRepository(session=db_session)
    
    tech1 = Technology(id=uuid4(), name="Python")
    tech2 = Technology(id=uuid4(), name="PostgreSQL")
    loc1 = Location(id=uuid4(), name="Warsaw")
    
    db_session.add_all([tech1, tech2, loc1])
    await db_session.commit()

    offer = await repo.create_with_relationships(
        site_id=uuid4(),
        exp_level_id=uuid4(),
        company_id=uuid4(),
        work_type_id=uuid4(),
        specialization_id=uuid4(),
        url="https://example.com/rel",
        title="Fullstack",
        description="With relationships",
        technologies=[tech1, tech2],
        locations=[loc1]
    )

    assert len(offer.technologies) == 2
    assert len(offer.locations) == 1
    assert offer.technologies[0].name in ["Python", "PostgreSQL"]


@pytest.mark.asyncio
async def test_update_and_delete(db_session: AsyncSession):
    repo = JobOffersRepository(session=db_session)
    
    offer = await repo.create(
        site_id=uuid4(), exp_level_id=uuid4(), company_id=uuid4(),
        work_type_id=uuid4(), specialization_id=uuid4(),
        url="delete-me.com", title="Old Title", description="Old Desc"
    )
    
    # Test update
    updated_offer = await repo.update(offer_id=offer.id, title="New Title", salary_from=5000)
    assert updated_offer is not None
    assert updated_offer.title == "New Title"
    assert updated_offer.salary_from == 5000

    # Test delete
    deleted = await repo.delete(offer_id=offer.id)
    assert deleted is True
    
    fetched = await repo.get_by_id(offer.id)
    assert fetched is None
