from typing import List, Annotated

from fastapi import APIRouter, Depends

from src.services.lookups_service import LookupsService
from src.api.v1.deps import get_lookups_service, get_optional_current_user

from src.core.settings import UnregisteredUserSettings
from src.core.exceptions import RecordNotFoundError

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

from src.models.users import User

router = APIRouter(prefix="/lookups", tags=["Lookup Data"])

@router.get("/experience-levels", response_model=List[LookupRead])
@router.get(
    "/experience-levels",
    response_model=List[LookupRead],
    summary="Get experience levels",
    responses={
        200: {
            "description": "List of experience levels",
            "content": {
                "application/json": {
                    "example": [
                        {"id": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "name": "Junior"},
                        {"id": "4ba85f64-5717-4562-b3fc-2c963f66afa7", "name": "Mid"}
                    ]
                }
            }
        }
    }
)
async def get_experience_levels(lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]):
    """
    Retrieves a list of all available experience levels to populate frontend dropdowns.
    """
    exp_levels = await lookups_service.get_all(ExperienceLevel)
    return exp_levels

@router.get("/work-types", response_model=List[LookupRead])
@router.get(
    "/work-types",
    response_model=List[LookupRead],
    summary="Get work types",
    responses={
        200: {
            "description": "List of work types",
            "content": {
                "application/json": {
                    "example": [{"id": "123e4567-e89b-12d3-a456-426614174000", "name": "remote"}]
                }
            }
        }
    }
)
async def get_work_types(lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]):
    """
    Retrieves a list of all available work types.
    """
    work_types = await lookups_service.get_all(WorkType)
    return work_types

@router.get("/sites", response_model=List[LookupRead])
@router.get(
    "/sites",
    response_model=List[LookupRead],
    summary="Get job offer sources (sites)",
    responses={
        200: {
            "description": "List of job board sites",
            "content": {
                "application/json": {
                    "example": [{"id": "987e6543-e21b-34d3-b456-426614174000", "name": "pracuj.pl"}]
                }
            }
        }
    }
)
async def get_sites(
    lookups_service: Annotated[LookupsService, Depends(get_lookups_service)],
    user: Annotated[User, Depends(get_optional_current_user)]
):
   
    """
    Retrieves a list of job board sites (origins of job offers).
    
    Behaves differently based on authorization state:
    * **Authenticated users**: Returns all available sites.
    * **Unauthenticated users**: Returns only a limited, default site (e.g., 'pracuj.pl') based on settings.
    """
    if user:
        return await lookups_service.get_all(Site)
    else:
        try:
            limited_site = await lookups_service.get_by_name(Site, UnregisteredUserSettings.SITE_NAME.value)
            return [limited_site]
        except RecordNotFoundError:
            if all_sites := await lookups_service.get_all(Site):
                return [all_sites[0]]
            else:
                return []

@router.get("/companies", response_model=List[LookupRead])
@router.get(
    "/companies",
    response_model=List[LookupRead],
    summary="Get companies",
    responses={
        200: {
            "description": "List of companies",
            "content": {
                "application/json": {
                    "example": [{"id": "abc12345-e89b-12d3-a456-426614174000", "name": "Google Poland"}]
                }
            }
        }
    }
)
async def get_companies(lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]):
    """
    Retrieves a list of all scraped companies.
    """
    companies = await lookups_service.get_all(Company)
    return companies

@router.get("/specializations", response_model=List[LookupRead])
@router.get(
    "/specializations",
    response_model=List[LookupRead],
    summary="Get specializations",
    responses={
        200: {
            "description": "List of IT specializations",
            "content": {
                "application/json": {
                    "example": [{"id": "def12345-e89b-12d3-a456-426614174000", "name": "Backend"}]
                }
            }
        }
    }
)
async def get_specializations(lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]):
    """
    Retrieves a list of all job specializations (e.g., Backend, Frontend, DevOps).
    """
    specializations = await lookups_service.get_all(Specialization)
    return specializations

@router.get("/technologies", response_model=List[LookupRead])
@router.get(
    "/technologies",
    response_model=List[LookupRead],
    summary="Get technologies",
    responses={
        200: {
            "description": "List of recognized technologies",
            "content": {
                "application/json": {
                    "example": [{"id": "xyz12345-e89b-12d3-a456-426614174000", "name": "Python"}]
                }
            }
        }
    }
)
async def get_technologies(lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]):
    """
    Retrieves a list of all recognized technologies used for filtering and CV matching.
    """
    technologies = await lookups_service.get_all(Technology)
    return technologies

@router.get("/locations", response_model=List[LookupRead])
@router.get(
    "/locations",
    response_model=List[LookupRead],
    summary="Get locations"
)
async def get_locations(lookups_service: Annotated[LookupsService, Depends(get_lookups_service)]):
    """
    Retrieves a list of all available locations / cities.
    """
    locations = await lookups_service.get_all(Location)
    return locations
