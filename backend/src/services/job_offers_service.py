from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException

from src.repositories.job_offers import JobOffersRepository
from src.models.job_offers import JobOffer


class JobOffersService:
    def __init__(self, repo: JobOffersRepository):
        self.repo = repo

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[JobOffer]:
        """
        Get all job offers with pagination.
        """
        return await self.repo.get_all(skip=skip, limit=limit)

    async def get_by_id(self, offer_id: UUID) -> JobOffer:
        """
        Get a job offer by its ID. Raises 404 if not found.
        """
        offer = await self.repo.get_by_id(offer_id)
        if offer is None:
            raise HTTPException(status_code=404, detail=f"Job offer with ID {offer_id} not found")
        return offer

    async def get_by_title(self, title: str) -> List[JobOffer]:
        """
        Get job offers by title (partial match).
        """
        if not title or len(title.strip()) == 0:
            raise HTTPException(status_code=400, detail="Title search parameter cannot be empty")
        return await self.repo.get_by_title(title)

    async def get_by_company_id(self, company_id: UUID) -> List[JobOffer]:
        """
        Get all job offers from a specific company.
        """
        offers = await self.repo.get_by_company_id(company_id)
        if not offers:
            raise HTTPException(status_code=404, detail=f"No job offers found for company {company_id}")
        return offers

    async def get_by_site_id(self, site_id: UUID) -> List[JobOffer]:
        """
        Get all job offers from a specific site.
        """
        offers = await self.repo.get_by_site_id(site_id)
        if not offers:
            raise HTTPException(status_code=404, detail=f"No job offers found for site {site_id}")
        return offers

    async def get_by_work_type_id(self, work_type_id: UUID) -> List[JobOffer]:
        """
        Get job offers by work type.
        """
        offers = await self.repo.get_by_work_type_id(work_type_id)
        if not offers:
            raise HTTPException(status_code=404, detail=f"No job offers found for work type {work_type_id}")
        return offers

    async def get_by_specialization_id(self, specialization_id: UUID) -> List[JobOffer]:
        """
        Get job offers by specialization.
        """
        offers = await self.repo.get_by_specialization_id(specialization_id)
        if not offers:
            raise HTTPException(status_code=404, detail=f"No job offers found for specialization {specialization_id}")
        return offers

    async def get_by_experience_level_id(self, exp_level_id: UUID) -> List[JobOffer]:
        """
        Get job offers by experience level.
        """
        offers = await self.repo.get_by_experience_level_id(exp_level_id)
        if not offers:
            raise HTTPException(status_code=404, detail=f"No job offers found for experience level {exp_level_id}")
        return offers

    async def filter(
        self,
        skip: int = 0,
        limit: int = 100,
        site_id: Optional[UUID] = None,
        company_id: Optional[UUID] = None,
        work_type_id: Optional[UUID] = None,
        specialization_id: Optional[UUID] = None,
        exp_level_id: Optional[UUID] = None,
        title: Optional[str] = None,
        salary_from_min: Optional[float] = None,
        salary_to_max: Optional[float] = None,
    ) -> List[JobOffer]:
        """
        Filter job offers by multiple criteria.
        All parameters are optional - combine any criteria you need.
        Returns empty list if no offers match the criteria.
        """
        # Validate salary range if provided
        if salary_from_min is not None and salary_to_max is not None and salary_from_min > salary_to_max:
            raise HTTPException(status_code=400, detail="salary_from_min cannot be greater than salary_to_max")

        offers = await self.repo.filter(
            skip=skip,
            limit=limit,
            site_id=site_id,
            company_id=company_id,
            work_type_id=work_type_id,
            specialization_id=specialization_id,
            exp_level_id=exp_level_id,
            title=title,
            salary_from_min=salary_from_min,
            salary_to_max=salary_to_max,
        )
        return offers

    async def create(
        self,
        site_id: UUID,
        exp_level_id: UUID,
        company_id: UUID,
        work_type_id: UUID,
        specialization_id: UUID,
        url: str,
        title: str,
        description: str,
        salary_from: Optional[float] = None,
        salary_to: Optional[float] = None,
    ) -> JobOffer:
        """
        Create a new job offer with validation.
        """
        # Validate inputs
        if not url or not url.strip():
            raise HTTPException(status_code=400, detail="URL is required")
        if not title or not title.strip():
            raise HTTPException(status_code=400, detail="Title is required")
        if not description or not description.strip():
            raise HTTPException(status_code=400, detail="Description is required")

        # Validate salary range if provided
        if salary_from is not None and salary_to is not None and salary_from > salary_to:
            raise HTTPException(status_code=400, detail="salary_from cannot be greater than salary_to")

        return await self.repo.create(
            site_id=site_id,
            exp_level_id=exp_level_id,
            company_id=company_id,
            work_type_id=work_type_id,
            specialization_id=specialization_id,
            url=url,
            title=title,
            description=description,
            salary_from=salary_from,
            salary_to=salary_to,
        )

    async def update(
        self,
        offer_id: UUID,
        url: Optional[str] = None,
        title: Optional[str] = None,
        description: Optional[str] = None,
        salary_from: Optional[float] = None,
        salary_to: Optional[float] = None,
        work_type_id: Optional[UUID] = None,
        exp_level_id: Optional[UUID] = None,
    ) -> JobOffer:
        """
        Update a job offer with validation.
        """
        # Validate salary range if both provided
        if salary_from is not None and salary_to is not None and salary_from > salary_to:
            raise HTTPException(status_code=400, detail="salary_from cannot be greater than salary_to")

        updated_offer = await self.repo.update(
            offer_id=offer_id,
            url=url,
            title=title,
            description=description,
            salary_from=salary_from,
            salary_to=salary_to,
            work_type_id=work_type_id,
            exp_level_id=exp_level_id,
        )

        if updated_offer is None:
            raise HTTPException(status_code=404, detail=f"Job offer with ID {offer_id} not found")

        return updated_offer

    async def delete(self, offer_id: UUID) -> None:
        """
        Delete a job offer.
        """
        success = await self.repo.delete(offer_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Job offer with ID {offer_id} not found")

    async def add_technology(self, offer_id: UUID, technology_id: UUID) -> JobOffer:
        """
        Add a technology to a job offer.
        """
        updated_offer = await self.repo.add_technology(offer_id, technology_id)
        if updated_offer is None:
            raise HTTPException(status_code=404, detail=f"Job offer with ID {offer_id} not found")
        return updated_offer

    async def remove_technology(self, offer_id: UUID, technology_id: UUID) -> JobOffer:
        """
        Remove a technology from a job offer.
        """
        updated_offer = await self.repo.remove_technology(offer_id, technology_id)
        if updated_offer is None:
            raise HTTPException(status_code=404, detail=f"Job offer with ID {offer_id} not found or technology not associated")
        return updated_offer

    async def add_location(self, offer_id: UUID, location_id: UUID) -> JobOffer:
        """
        Add a location to a job offer.
        """
        updated_offer = await self.repo.add_location(offer_id, location_id)
        if updated_offer is None:
            raise HTTPException(status_code=404, detail=f"Job offer with ID {offer_id} not found")
        return updated_offer

    async def remove_location(self, offer_id: UUID, location_id: UUID) -> JobOffer:
        """
        Remove a location from a job offer.
        """
        updated_offer = await self.repo.remove_location(offer_id, location_id)
        if updated_offer is None:
            raise HTTPException(status_code=404, detail=f"Job offer with ID {offer_id} not found or location not associated")
        return updated_offer
