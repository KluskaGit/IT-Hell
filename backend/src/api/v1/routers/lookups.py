from typing import List, Annotated

from fastapi import APIRouter, Depends

from src.services.lookups_service import LookupsService
from src.api.v1.deps import get_lookups_service

from src.schemas.lookups import (
    LookupRead,
)
from src.models.lookups import (
    ExperienceLevel,
    WorkType,
)

router = APIRouter(tags=["Lookup Data"])

@router.get("/experience-levels", response_model=List[LookupRead])
async def get_experience_levels(lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]):
    exp_levels = await lookups_service.get_all(ExperienceLevel)
    return exp_levels

@router.get("/work-types", response_model=List[LookupRead])
async def get_work_types(lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]):
    work_types = await lookups_service.get_all(WorkType)
    return work_types
