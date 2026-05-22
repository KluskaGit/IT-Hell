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
async def get_job_offers(
    job_offers_service: Annotated[JobOffersService, Depends(get_job_offers_service)],
    filters: Annotated[JobOfferFilter, Query()],
    lookups_service: Annotated[LookupsService, Depends(get_lookups_service)],
    user: Annotated[User, Depends(get_optional_current_user)]
):
    """
    Pobiera listę ofert pracy na podstawie przekazanych kryteriów filtrowania.
    Wszystkie parametry są opcjonalne.
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


