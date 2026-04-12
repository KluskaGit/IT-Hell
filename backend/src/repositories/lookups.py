from typing import Type, TypeVar, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models.lookups import Lookup

T = TypeVar("T", bound=Lookup)

class LookupsRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(self, model: Type[T]) -> List[T]:
        """
        Get all records for a given Lookup model.
        """
        stmt = select(model)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
    
    async def get_by_name(self, model: Type[T], name: str) -> T | None:
        """
        Get a specific record by its name for a given Lookup model.
        """
        stmt = select(model).where(model.name == name)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_by_id(self, model: Type[T], lookup_id: str) -> T | None:
        """
        Get a specific record by its ID for a given Lookup model.
        """
        stmt = select(model).where(model.id == lookup_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()
    
    async def add(self, model: Type[T], name: str) -> T:
        """
        Add a new record to a given Lookup model.
        """
        new_record = model(name=name)
        self.session.add(new_record)
        await self.session.commit()
        await self.session.refresh(new_record)
        return new_record
    
    async def update(self, model: Type[T], lookup_id: str, name: str) -> T | None:
        """
        Update the name of a specific record for a given Lookup model.
        """
        stmt = select(model).where(model.id == lookup_id)
        result = await self.session.execute(stmt)
        record = result.scalars().first()
        if record:
            record.name = name
            await self.session.commit()
            await self.session.refresh(record)
            return record
        return None
    
    async def delete(self, model: Type[T], lookup_id: str) -> bool:
        """
        Delete a specific record by its ID for a given Lookup model.
        """
        stmt = select(model).where(model.id == lookup_id)
        result = await self.session.execute(stmt)
        record = result.scalars().first()
        if record:
            await self.session.delete(record)
            await self.session.commit()
            return True
        return False