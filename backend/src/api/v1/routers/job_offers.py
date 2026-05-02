from typing import Annotated, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import delete

from src.core.db import SessionDep
from src.models.job_offers import JobOffer
from src.services.job_offers_service import JobOffersService
from src.api.v1.deps import get_job_offers_service
from src.schemas.job_offers import JobOfferResponse, JobOfferFilter, JobOfferScraperCreate


router = APIRouter(prefix="/job-offers", tags=["Job Offers"])


@router.get("/get_offer_filter", response_model=List[JobOfferResponse])
async def get_job_offers(
    job_offers_service: Annotated[JobOffersService, Depends(get_job_offers_service)],
    filters: Annotated[JobOfferFilter, Query()],
):
    """
    Pobiera listę ofert pracy na podstawie przekazanych kryteriów filtrowania.
    Wszystkie parametry są opcjonalne.
    """
    return await job_offers_service.filter(**filters.model_dump())


