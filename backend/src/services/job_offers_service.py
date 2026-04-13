from typing import List, Optional, Type, TypeVar
from uuid import UUID

from src.repositories.job_offers import JobOffersRepository
from src.models.job_offers import JobOffer
from src.models.lookups import (
    Technology,
    Location,
    Site,
    ExperienceLevel,
    Company,
    WorkType,
    Specialization,
    Lookup,
)
from src.services.lookups_service import LookupsService
from src.core.exceptions import RecordNotFoundError, ValidationError, RecordAlreadyExistsError

TLookup = TypeVar("TLookup", bound=Lookup)

class JobOffersService:
    def __init__(self, repo: JobOffersRepository, lookups_service: LookupsService):
        self.repo = repo
        self.lookups_service = lookups_service

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
            raise RecordNotFoundError(f"Job offer with ID {offer_id} not found")
        return offer

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
            raise ValidationError("salary_from_min cannot be greater than salary_to_max")

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
            raise ValidationError("URL is required")
        if not title or not title.strip():
            raise ValidationError("Title is required")
        if not description or not description.strip():
            raise ValidationError("Description is required")

        # Validate salary range if provided
        if salary_from is not None and salary_to is not None and salary_from > salary_to:
            raise ValidationError("salary_from cannot be greater than salary_to")

        # Check if URL is unique
        existing_offer = await self.repo.get_by_url(url)
        if existing_offer:
            raise RecordAlreadyExistsError(f"Job offer with URL '{url}' already exists")

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
            raise ValidationError("salary_from cannot be greater than salary_to")

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
            raise RecordNotFoundError(f"Job offer with ID {offer_id} not found")

        return updated_offer

    async def delete(self, offer_id: UUID) -> None:
        """
        Delete a job offer.
        """
        success = await self.repo.delete(offer_id)
        if not success:
            raise RecordNotFoundError(f"Job offer with ID {offer_id} not found")

    async def create_from_scraper(
        self,
        site_name: str,
        exp_level_name: str,
        company_name: str,
        work_type_name: str,
        specialization_name: str,
        url: str,
        title: str,
        description: str,
        technology_names: List[str],
        location_names: List[str],
        salary_from: Optional[float] = None,
        salary_to: Optional[float] = None,
    ) -> JobOffer:
        """
        Create a job offer with technologies and locations from scraper data.
        
        This method handles the complete flow for scrapers:
        1. Validates all input data
        2. Resolves all string names (site, company, etc.) to database IDs
        3. Creates the offer with relationships in ONE atomic transaction
        
        Returns a complete JobOffer with all relationships loaded.
        
        Raises:
        - 400 if required fields are empty
        """
        # Validate basic required fields
        if not url or not url.strip():
            raise ValidationError("URL is required")
        if not title or not title.strip():
            raise ValidationError("Title is required")
        if not description or not description.strip():
            raise ValidationError("Description is required")

        # Validate salary range if provided
        if salary_from is not None and salary_to is not None and salary_from > salary_to:
            raise ValidationError("salary_from cannot be greater than salary_to")

        # Validate technology and location lists
        if not technology_names or len(technology_names) == 0:
            raise ValidationError("At least one technology is required")
        if not location_names or len(location_names) == 0:
            raise ValidationError("At least one location is required")

        # Check if URL is unique
        existing_offer = await self.repo.get_by_url(url)
        if existing_offer:
            raise RecordAlreadyExistsError(f"Job offer with URL '{url}' already exists")

        async def get_or_create(model_cls: Type[TLookup], name: str) -> TLookup:
            if not name or not name.strip():
                raise ValidationError(f"{model_cls.__name__} name is required")
            try:
                return await self.lookups_service.get_by_name(model_cls, name)
            except RecordNotFoundError:
                return await self.lookups_service.add(model_cls, name)

        site = await get_or_create(Site, site_name)
        exp_level = await get_or_create(ExperienceLevel, exp_level_name)
        company = await get_or_create(Company, company_name)
        work_type = await get_or_create(WorkType, work_type_name)
        specialization = await get_or_create(Specialization, specialization_name)

        # --- Resolve Technologies (Get-or-Create) ---
        technologies = []
        for tech_name in technology_names:
            tech = await get_or_create(Technology, tech_name)
            technologies.append(tech)

        # --- Resolve Locations (Get-or-Create) ---
        locations = []
        for loc_name in location_names:
            loc = await get_or_create(Location, loc_name)
            locations.append(loc)

        # Create offer with all relationships in one atomic transaction
        return await self.repo.create_with_relationships(
            site_id=site.id,
            exp_level_id=exp_level.id,
            company_id=company.id,
            work_type_id=work_type.id,
            specialization_id=specialization.id,
            url=url,
            title=title,
            description=description,
            technologies=technologies,
            locations=locations,
            salary_from=salary_from,
            salary_to=salary_to,
        )
