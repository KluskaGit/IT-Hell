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
    Site,
    Company,
    Specialization,
    Technology,
    Location,
)

router = APIRouter(prefix="/lookups", tags=["Lookup Data"])

@router.get("/experience-levels", response_model=List[LookupRead])
async def get_experience_levels(lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]):
    exp_levels = await lookups_service.get_all(ExperienceLevel)
    return exp_levels

@router.get("/work-types", response_model=List[LookupRead])
async def get_work_types(lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]):
    work_types = await lookups_service.get_all(WorkType)
    return work_types

@router.get("/sites", response_model=List[LookupRead])
async def get_sites(lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]):
    sites = await lookups_service.get_all(Site)
    return sites

@router.get("/companies", response_model=List[LookupRead])
async def get_companies(lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]):
    companies = await lookups_service.get_all(Company)
    return companies

@router.get("/specializations", response_model=List[LookupRead])
async def get_specializations(lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]):
    specializations = await lookups_service.get_all(Specialization)
    return specializations

@router.get("/technologies", response_model=List[LookupRead])
async def get_technologies(lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]):
    technologies = await lookups_service.get_all(Technology)
    return technologies

@router.get("/locations", response_model=List[LookupRead])
async def get_locations(lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]):
    locations = await lookups_service.get_all(Location)
    return locations
