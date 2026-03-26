from fastapi import APIRouter
from typing import List

from src.db import SessionDep
from src.repositories import lookups
from src.schemas.lookups import (
    ExperienceLevelRead,
    WorkTypeRead
)

router = APIRouter(tags=["Lookup Data"])

@router.get("/experience-levels", response_model=List[ExperienceLevelRead])
async def read_experience_levels(session: SessionDep):
    exp_levels = await lookups.get_experience_levels(session)
    return exp_levels

@router.get("/work-types", response_model=List[WorkTypeRead])
async def read_work_types(session: SessionDep):
    work_types = await  lookups.get_work_types(session)
    return work_types