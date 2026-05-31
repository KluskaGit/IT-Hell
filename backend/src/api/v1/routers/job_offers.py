from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query

from src.services.job_offers_service import JobOffersService
from src.services.lookups_service import LookupsService

from src.api.v1.deps import get_job_offers_service, get_optional_current_user, get_lookups_service

from src.models.users import User
from src.models.lookups import Site

from src.schemas.job_offers import JobOfferResponse, JobOfferFilter

from src.core.settings import UnregisteredUserSettings
from src.core.exceptions import RecordNotFoundError



router = APIRouter(prefix="/job-offers", tags=["Job Offers"])


@router.get("/get_offer_filter", response_model=List[JobOfferResponse])
@router.get(
    "/get_offer_filter",
    response_model=List[JobOfferResponse],
    summary="Get filtered job offers",
    responses={
        200: {
            "description": "List of job offers matching the criteria",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": "123e4567-e89b-12d3-a456-426614174000",
                            "title": "Senior Python Developer",
                            "url": "https://pracuj.pl/oferta/123",
                            "description": "Looking for an experienced Python developer...",
                            "salary_from": 15000,
                            "salary_to": 22000,
                            "publication_date": "2023-10-01T12:00:00Z",
                            "expiration_date": "2023-11-01T12:00:00Z",
                            "site": {"id": "987e6543-e21b-34d3-b456-426614174000", "name": "pracuj.pl"},
                            "company": {"id": "abc12345-e89b-12d3-a456-426614174000", "name": "Tech Corp"},
                            "work_type": {"id": "def12345-e89b-12d3-a456-426614174000", "name": "Remote"},
                            "experience_level": {"id": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "name": "Senior"},
                            "specialization": {"id": "xyz12345-e89b-12d3-a456-426614174000", "name": "Backend"},
                            "technologies": [{"id": "xyz12345-e89b-12d3-a456-426614174000", "name": "Python"}],
                            "locations": [{"id": "loc12345-e89b-12d3-a456-426614174000", "name": "Warsaw"}]
                        }
                    ]
                }
            }
        }
    }
)
async def get_job_offers(
    job_offers_service: Annotated[JobOffersService, Depends(get_job_offers_service)],
    filters: Annotated[JobOfferFilter, Query()],
    lookups_service: Annotated[LookupsService, Depends(get_lookups_service)],
    user: Annotated[User, Depends(get_optional_current_user)]
):
    """
    Retrieves a list of job offers based on provided filtering criteria (e.g., technologies, salary range).
    All parameters are optional.
    
    **Authorization behavior:**
    * **Authenticated users:** Have full access to job offers from all available sources (sites).
    * **Unauthenticated users:** Have their results restricted to a single default source (e.g., 'pracuj.pl').
    """
    if user:
        return await job_offers_service.filter(**filters.model_dump())
    else:
        try:
            limited_site_id = await lookups_service.get_by_name(Site, UnregisteredUserSettings.SITE_NAME.value)
        except RecordNotFoundError:
            if all_sites := await lookups_service.get_all(Site):
                limited_site_id = all_sites[0]
            else:
                return []

        filters.site_ids=[limited_site_id.id]
        return await job_offers_service.filter(**filters.model_dump())


