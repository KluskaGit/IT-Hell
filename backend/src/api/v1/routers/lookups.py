from fastapi import APIRouter
from typing import List

from src.core.db import SessionDep
from src.repositories.lookups import get_experience_levels
from src.schemas.lookups import (
    CompanyNameRead,
    ExperienceLevelRead,
    LocationRead,
    SiteUrlRead,
    SpecializationRead,
    TechnologyRead,
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

@router.get("/site-urls", response_model=List[SiteUrlRead])
async def read_site_urls(session: SessionDep):
    sites_urls = await lookups.get_site_urls(session)
    return sites_urls

@router.get("/company-names", response_model=List[CompanyNameRead])
async def read_company_names(session: SessionDep):
    company_names = await lookups.get_company_names(session)
    return company_names

@router.get("/locations", response_model=List[LocationRead])
async def read_locations(session: SessionDep):
    locations = await lookups.get_locations(session)
    return locations

@router.get("/specializations", response_model=List[SpecializationRead])
async def read_specializations(session: SessionDep):
    specializations = await lookups.get_specializations(session)
    return specializations

@router.get("/technologies", response_model=List[TechnologyRead])
async def read_technologies(session: SessionDep):
    technologies = await lookups.get_technologies(session)
    return technologies