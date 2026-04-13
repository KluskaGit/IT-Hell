from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from src.models.job_offers import JobOffer
from src.models.lookups import Technology, Location


class JobOffersRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[JobOffer]:
        """
        Get all job offers with pagination.
        """
        stmt = select(JobOffer).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, offer_id: UUID) -> Optional[JobOffer]:
        """
        Get a job offer by its ID.
        """
        stmt = select(JobOffer).where(JobOffer.id == offer_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_by_url(self, url: str) -> Optional[JobOffer]:
        """
        Get a job offer by its URL.
        """
        stmt = select(JobOffer).where(JobOffer.url == url)
        result = await self.session.execute(stmt)
        return result.scalars().first()

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
        All parameters are optional - use only the ones you need.
        """
        conditions = []

        if site_id is not None:
            conditions.append(JobOffer.site_id == site_id)
        if company_id is not None:
            conditions.append(JobOffer.company_id == company_id)
        if work_type_id is not None:
            conditions.append(JobOffer.work_type_id == work_type_id)
        if specialization_id is not None:
            conditions.append(JobOffer.specialization_id == specialization_id)
        if exp_level_id is not None:
            conditions.append(JobOffer.exp_level_id == exp_level_id)
        if title is not None:
            conditions.append(JobOffer.title.ilike(f"%{title}%"))
        if salary_from_min is not None:
            conditions.append(JobOffer.salary_from >= salary_from_min)
        if salary_to_max is not None:
            conditions.append(JobOffer.salary_to <= salary_to_max)

        if conditions:
            stmt = select(JobOffer).where(and_(*conditions)).offset(skip).limit(limit)
        else:
            stmt = select(JobOffer).offset(skip).limit(limit)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

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
        Create a new job offer.
        """
        job_offer = JobOffer(
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
        self.session.add(job_offer)
        await self.session.commit()
        await self.session.refresh(job_offer)
        return job_offer

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
    ) -> Optional[JobOffer]:
        """
        Update a job offer's mutable fields.
        """
        stmt = select(JobOffer).where(JobOffer.id == offer_id)
        result = await self.session.execute(stmt)
        offer = result.scalars().first()

        if offer:
            if url is not None:
                offer.url = url
            if title is not None:
                offer.title = title
            if description is not None:
                offer.description = description
            if salary_from is not None:
                offer.salary_from = salary_from
            if salary_to is not None:
                offer.salary_to = salary_to
            if work_type_id is not None:
                offer.work_type_id = work_type_id
            if exp_level_id is not None:
                offer.exp_level_id = exp_level_id

            await self.session.commit()
            await self.session.refresh(offer)
            return offer
        return None

    async def delete(self, offer_id: UUID) -> bool:
        """
        Delete a job offer by its ID.
        """
        stmt = select(JobOffer).where(JobOffer.id == offer_id)
        result = await self.session.execute(stmt)
        offer = result.scalars().first()

        if offer:
            await self.session.delete(offer)
            await self.session.commit()
            return True
        return False

    async def get_technology_ids_by_names(self, technology_names: List[str]) -> List[UUID]:
        """
        Resolve technology names to their UUIDs.
        Used by scrapers to convert string technology names to database IDs.
        """
        if not technology_names:
            return []

        stmt = select(Technology.id).where(Technology.name.in_(technology_names))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_technologies_by_names(self, technology_names: List[str]) -> List[Technology]:
        """
        Get Technology objects by their names.
        Used to validate which names were found and which are missing.
        """
        if not technology_names:
            return []

        stmt = select(Technology).where(Technology.name.in_(technology_names))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_location_ids_by_cities(self, location_cities: List[str]) -> List[UUID]:
        """
        Resolve location names to their UUIDs.
        Used by scrapers to convert string location names to database IDs.
        """
        if not location_cities:
            return []

        stmt = select(Location.id).where(Location.name.in_(location_cities))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_locations_by_cities(self, location_cities: List[str]) -> List[Location]:
        """
        Get Location objects by their names.
        Used to validate which names were found and which are missing.
        """
        if not location_cities:
            return []

        stmt = select(Location).where(Location.name.in_(location_cities))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_with_relationships(
        self,
        site_id: UUID,
        exp_level_id: UUID,
        company_id: UUID,
        work_type_id: UUID,
        specialization_id: UUID,
        url: str,
        title: str,
        description: str,
        technologies: List[Technology],
        locations: List[Location],
        salary_from: Optional[float] = None,
        salary_to: Optional[float] = None,
    ) -> JobOffer:
        """
        Create a new job offer with technologies and locations in ONE atomic transaction.
        This is the preferred method for scrapers - all data (offer + relationships) 
        is inserted and committed together.
        
        If ANY part fails, the entire operation rolls back - no partial data in database.
        """
        # Create the offer instance (not committed yet)
        job_offer = JobOffer(
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

        # Add to session but don't commit yet
        self.session.add(job_offer)

        # Initialize collections to avoid lazy-load issues in async context
        job_offer.technologies = []
        job_offer.locations = []
        # Associate the resolved technologies and locations.
        job_offer.technologies = technologies
        job_offer.locations = locations

        # ONE commit for everything: job_offers + job_offer_technology + job_offer_location
        await self.session.commit()

        # Reload offer with ALL relationships using selectinload to avoid lazy-load in async
        stmt = select(JobOffer).where(JobOffer.id == job_offer.id) \
            .options(
                selectinload(JobOffer.site),
                selectinload(JobOffer.company),
                selectinload(JobOffer.work_type),
                selectinload(JobOffer.exp_level),
                selectinload(JobOffer.specialization),
                selectinload(JobOffer.technologies),
                selectinload(JobOffer.locations)
            )
        result = await self.session.execute(stmt)
        return result.scalar_one()
