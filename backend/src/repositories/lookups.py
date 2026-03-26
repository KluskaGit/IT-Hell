from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models.lookups import (
    ExperienceLevel,
)

async def get_experience_levels(session: AsyncSession):
    stmt = select(ExperienceLevel)
    result = await session.execute(stmt)
    exp_levels = result.scalars().all()
    
    return exp_levels