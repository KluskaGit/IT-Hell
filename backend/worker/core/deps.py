from contextlib import asynccontextmanager
from typing import AsyncGenerator

from src.core.db import a_sessionmaker
from src.repositories.lookups import LookupsRepository
from src.services.lookups_service import LookupsService

@asynccontextmanager
async def get_lookups_service() -> AsyncGenerator[LookupsService, None]:
    """
    Kapsułkuje logikę otwierania sesji DB, tworzenia repozytorium 
    i wstrzykiwania go do serwisu.
    """
    async with a_sessionmaker() as session:
        try:
            repo = LookupsRepository(session)
            service = LookupsService(repo)
            
            yield service
            
        except Exception:
            await session.rollback()
            raise