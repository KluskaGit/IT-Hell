from contextlib import asynccontextmanager
from typing import AsyncGenerator

from src.core.db import a_sessionmaker
from src.repositories.lookups import LookupsRepository
from src.repositories.job_offers import JobOffersRepository

from src.services.job_offers_service import JobOffersService
from src.services.lookups_service import LookupsService

@asynccontextmanager
async def get_lookups_service() -> AsyncGenerator[LookupsService, None]:
    """
    Async context manager for LookupsService.
    """
    async with a_sessionmaker() as session:
        try:
            repo = LookupsRepository(session)
            service = LookupsService(repo)
            
            yield service
            
        except Exception:
            await session.rollback()
            raise

@asynccontextmanager
async def get_job_offers_service() -> AsyncGenerator[JobOffersService, None]:
    """
    Async context manager for JobOffersService.
    """
    async with a_sessionmaker() as session:
        try:
            job_repo = JobOffersRepository(session)
            lookup_repo = LookupsRepository(session)
            lookup_service = LookupsService(lookup_repo)
            
            service = JobOffersService(job_repo, lookup_service)
            
            yield service
            
        except Exception:
            await session.rollback()
            raise