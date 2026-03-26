from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models.lookups import (
    Company,
    ExperienceLevel,
    Location,
    Specialization,
    Technology,
    WorkType,
    Site
)

async def get_experience_levels(session: AsyncSession):
    stmt = select(ExperienceLevel)
    result = await session.execute(stmt)
    exp_levels = result.scalars().all()
    
    return exp_levels

async def get_work_types(session: AsyncSession):
    stmt = select(WorkType)
    result = await session.execute(stmt)
    work_types = result.scalars().all()
    return work_types

async def get_site_urls(session: AsyncSession):
    stmt = select(Site)
    result = await session.execute(stmt)
    sites_url = result.scalars().all()
    return sites_url

async def get_company_names(session: AsyncSession):
    stmt = select(Company)
    result = await session.execute(stmt)
    company_names = result.scalars().all()
    return company_names

async def get_locations(session: AsyncSession):
    stmt = select(Location)
    result = await session.execute(stmt)
    locations = result.scalars().all()
    return locations

async def get_specializations(session: AsyncSession):
    stmt = select(Specialization)
    result = await session.execute(stmt)
    specializations = result.scalars().all()
    return specializations

async def get_technologies(session: AsyncSession):
    stmt = select(Technology)
    result = await session.execute(stmt)
    technologies = result.scalars().all()
    return technologies