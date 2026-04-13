from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from src.services.job_offers_service import JobOffersService
from src.api.v1.deps import get_job_offers_service


router = APIRouter(tags=["Lookup Data"])


@router.post("/create-sample")
async def create_lookup_sample(job_offers_service: Annotated[JobOffersService, Depends(get_job_offers_service)]):
    """Create a sample job offer using test data from test_job_offers_scraper.py."""
    offer = await job_offers_service.create_from_scraper(
        site_name="Przykładowy Portal",
        exp_level_name="Mid",
        company_name="Przykładowa Firma",
        work_type_name="B2B",
        specialization_name="Backend",
        url="https://example.com/job/123",
        title="Python Developer",
        description="Opis stanowiska...",
        technology_names=["Python", "FastAPI"],
        location_names=["Warszawa", "Zdalnie"],
        salary_from=10000,
        salary_to=16000,
    )


    return {
        "id": str(offer.id),
        "title": offer.title,
        "url": offer.url,
        "technologies": [t.name for t in offer.technologies],
        "locations": [l.name for l in offer.locations],
        "company": offer.company.name if getattr(offer, "company", None) else None,
        "site": offer.site.name if getattr(offer, "site", None) else None,
    }

