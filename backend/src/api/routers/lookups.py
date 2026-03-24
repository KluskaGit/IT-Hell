from fastapi import APIRouter
from sqlalchemy import select
from typing import List

from src.db import SessionDep
from src.models.lookups import WorkType
from src.api.schemas import WorkTypeSchema

router = APIRouter(prefix="/lookups", tags=["Lookups"])

@router.get("/work-types",response_model=List[WorkTypeSchema])
async def get_work_types(db: SessionDep):
    
    result = await db.execute(select(WorkType))

    work_type = result.scalars().all()

    return work_type