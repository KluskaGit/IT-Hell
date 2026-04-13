from typing import Annotated, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import delete

from src.core.db import SessionDep
from src.models.job_offers import JobOffer
from src.services.job_offers_service import JobOffersService
from src.api.v1.deps import get_job_offers_service
from src.schemas.job_offers import JobOfferResponse, JobOfferFilter


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


@router.post("/seed-samples")
async def seed_sample_offers(
    db: SessionDep,
    job_offers_service: Annotated[JobOffersService, Depends(get_job_offers_service)]
):
    """Wyczyść bazę ofert i dodaj zróżnicowane przykłady do testowania filtrów."""
    # 1. Wyczyszczenie obecnych ofert
    await db.execute(delete(JobOffer))
    await db.commit()

    # 2. Przygotowanie zróżnicowanych danych testowych
    samples = [
        {
            "site_name": "JustJoinIT",
            "exp_level_name": "Mid",
            "company_name": "Tech Corp",
            "work_type_name": "Zdalnie",
            "specialization_name": "Backend",
            "url": "https://example.com/job/python-mid",
            "title": "Python Developer",
            "description": "Szukamy programisty Pythona do pracy zdalnej...",
            "technology_names": ["Python", "FastAPI", "Docker"],
            "location_names": ["Warszawa", "Zdalnie"],
            "salary_from": 12000,
            "salary_to": 18000,
        },
        {
            "site_name": "NoFluffJobs",
            "exp_level_name": "Senior",
            "company_name": "FinTech LLC",
            "work_type_name": "Hybrydowo",
            "specialization_name": "Backend",
            "url": "https://example.com/job/java-senior",
            "title": "Senior Java Engineer",
            "description": "Wymagane 5 lat doświadczenia w bankowości...",
            "technology_names": ["Java", "Spring Boot", "SQL"],
            "location_names": ["Kraków", "Zdalnie"],
            "salary_from": 18000,
            "salary_to": 26000,
        },
        {
            "site_name": "Pracuj.pl",
            "exp_level_name": "Junior",
            "company_name": "Web Agency",
            "work_type_name": "Stacjonarnie",
            "specialization_name": "Frontend",
            "url": "https://example.com/job/react-junior",
            "title": "Junior React Developer",
            "description": "Dołącz do naszego biura w Gdańsku!",
            "technology_names": ["React", "JavaScript", "CSS"],
            "location_names": ["Gdańsk"],
            "salary_from": 6000,
            "salary_to": 9000,
        },
        {
            "site_name": "JustJoinIT",
            "exp_level_name": "Mid",
            "company_name": "Tech Corp",
            "work_type_name": "Zdalnie",
            "specialization_name": "Fullstack",
            "url": "https://example.com/job/fullstack-mid",
            "title": "Fullstack Python/React Developer",
            "description": "Twórz nowoczesne aplikacje webowe w pełnym stosie...",
            "technology_names": ["Python", "React", "Docker"],
            "location_names": ["Zdalnie"],
            "salary_from": 14000,
            "salary_to": 20000,
        }
    ]

    for sample in samples:
        await job_offers_service.create_from_scraper(**sample)

    return {"message": f"Wyczyszczono bazę i dodano {len(samples)} różnorodnych ofert."}
