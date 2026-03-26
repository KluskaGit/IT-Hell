from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models.lookups import (
    ExperienceLevel,
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