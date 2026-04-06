from fastapi import APIRouter
from typing import List

from src.core.db import SessionDep
from src.repositories.lookups import get_experience_levels
from src.schemas.lookups import (
    ExperienceLevelRead,
)

router = APIRouter(tags=["Lookup Data"])

@router.get("/experience-levels", response_model=List[ExperienceLevelRead])
async def read_experience_levels(session: SessionDep):
    exp_levels = await get_experience_levels(session)
    return exp_levels