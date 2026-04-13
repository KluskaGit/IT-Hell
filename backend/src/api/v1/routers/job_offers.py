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
        site_id=UUID("550e8400-e29b-41d4-a716-446655440000"),
        company_id=UUID("550e8400-e29b-41d4-a716-446655440001"),
        work_type_id=UUID("550e8400-e29b-41d4-a716-446655440002"),
        exp_level_id=UUID("550e8400-e29b-41d4-a716-446655440003"),
        specialization_id=UUID("550e8400-e29b-41d4-a716-446655440004"),
        title="Senior Java Developer",
        url="https://pracuj.pl/job/12345",
        description="Join our Google Poland team...",
        technology_names=["Java", "Spring", "Docker"],
        location_names=["Warszawa", "Remote"],
        salary_from=12000,
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

