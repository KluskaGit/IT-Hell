from typing import List, Type, TypeVar
from fastapi import HTTPException

from src.repositories.lookups import LookupsRepository
from src.models.lookups import Lookup

T = TypeVar("T", bound=Lookup)

class LookupsService:
    def __init__(self, repo: LookupsRepository):
        self.repo = repo

    async def get_all(self, model: Type[T]) -> List[T]:
        """_summary_

        Args:
            model (Type[T]): _description_

        Returns:
            List[T]: _description_
        """
        return await self.repo.get_all(model)
    
    async def get_by_name(self, model: Type[T], name: str) -> T | None:
        """_summary_

        Args:
            model (Type[T]): _description_
            name (str): _description_

        Returns:
            T | None: _description_
        """
        record = await self.repo.get_by_name(model, name)
        if record is None:
            raise HTTPException(status_code=404, detail=f"{model.__name__} with name '{name}' not found")
        return record
    
    async def get_by_id(self, model: Type[T], lookup_id: str) -> T | None:
        """_summary_

        Args:
            model (Type[T]): _description_
            lookup_id (str): _description_

        Returns:
            T | None: _description_
        """
        record = await self.repo.get_by_id(model, lookup_id)
        if record is None:
            raise HTTPException(status_code=404, detail=f"{model.__name__} with ID {lookup_id} not found")
        return record
    
    async def add(self, model: Type[T], name: str) -> T:
        """_summary_

        Args:
            model (Type[T]): _description_
            name (str): _description_

        Returns:
            T: _description_
        """
        existing_record = await self.repo.get_by_name(model, name)
        if existing_record:
            raise HTTPException(status_code=400, detail=f"{model.__name__} with name '{name}' already exists")
        
        return await self.repo.add(model, name)
    
    async def update(self, model: Type[T], lookup_id: str, name: str) -> T:
        """_summary_

        Args:
            model (Type[T]): _description_
            lookup_id (str): _description_
            name (str): _description_

        Returns:
            T: _description_
        """
        existing_record = await self.repo.get_by_name(model, name)
        if existing_record and existing_record.id != lookup_id:
            raise HTTPException(status_code=400, detail=f"{model.__name__} with name '{name}' already exists")
        
        updated_record = await self.repo.update(model, lookup_id, name)
        if updated_record is None:
            raise HTTPException(status_code=404, detail=f"{model.__name__} with ID {lookup_id} not found")
        
        return updated_record
    
    async def delete(self, model: Type[T], lookup_id: str) -> None:
        """_summary_

        Args:
            model (Type[T]): _description_
            lookup_id (str): _description_

        Returns:
            None: _description_
        """
        success = await self.repo.delete(model, lookup_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"{model.__name__} with ID {lookup_id} not found")