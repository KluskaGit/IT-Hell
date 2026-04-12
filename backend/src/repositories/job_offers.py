from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from src.models.job_offers import JobOffer


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

    async def get_by_title(self, title: str) -> List[JobOffer]:
        """
        Get job offers by title (partial match).
        """
        stmt = select(JobOffer).where(JobOffer.title.ilike(f"%{title}%"))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_company_id(self, company_id: UUID) -> List[JobOffer]:
        """
        Get all job offers from a specific company.
        """
        stmt = select(JobOffer).where(JobOffer.company_id == company_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_site_id(self, site_id: UUID) -> List[JobOffer]:
        """
        Get all job offers from a specific site.
        """
        stmt = select(JobOffer).where(JobOffer.site_id == site_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_work_type_id(self, work_type_id: UUID) -> List[JobOffer]:
        """
        Get job offers by work type.
        """
        stmt = select(JobOffer).where(JobOffer.work_type_id == work_type_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_specialization_id(self, specialization_id: UUID) -> List[JobOffer]:
        """
        Get job offers by specialization.
        """
        stmt = select(JobOffer).where(JobOffer.specialization_id == specialization_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_experience_level_id(self, exp_level_id: UUID) -> List[JobOffer]:
        """
        Get job offers by experience level.
        """
        stmt = select(JobOffer).where(JobOffer.exp_level_id == exp_level_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

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

    async def add_technology(self, offer_id: UUID, technology_id: UUID) -> Optional[JobOffer]:
        """
        Add a technology to a job offer's many-to-many relationship.
        """
        stmt = select(JobOffer).where(JobOffer.id == offer_id)
        result = await self.session.execute(stmt)
        offer = result.scalars().first()

        if offer:
            # Get the technology and add it
            from src.models.lookups import Technology
            tech_stmt = select(Technology).where(Technology.id == technology_id)
            tech_result = await self.session.execute(tech_stmt)
            technology = tech_result.scalars().first()

            if technology:
                offer.technologies.append(technology)
                await self.session.commit()
                await self.session.refresh(offer)
                return offer
        return None

    async def remove_technology(self, offer_id: UUID, technology_id: UUID) -> Optional[JobOffer]:
        """
        Remove a technology from a job offer's many-to-many relationship.
        """
        stmt = select(JobOffer).where(JobOffer.id == offer_id)
        result = await self.session.execute(stmt)
        offer = result.scalars().first()

        if offer:
            from src.models.lookups import Technology
            tech_stmt = select(Technology).where(Technology.id == technology_id)
            tech_result = await self.session.execute(tech_stmt)
            technology = tech_result.scalars().first()

            if technology and technology in offer.technologies:
                offer.technologies.remove(technology)
                await self.session.commit()
                await self.session.refresh(offer)
                return offer
        return None

    async def add_location(self, offer_id: UUID, location_id: UUID) -> Optional[JobOffer]:
        """
        Add a location to a job offer's many-to-many relationship.
        """
        stmt = select(JobOffer).where(JobOffer.id == offer_id)
        result = await self.session.execute(stmt)
        offer = result.scalars().first()

        if offer:
            # Get the location and add it
            from src.models.lookups import Location
            loc_stmt = select(Location).where(Location.id == location_id)
            loc_result = await self.session.execute(loc_stmt)
            location = loc_result.scalars().first()

            if location:
                offer.locations.append(location)
                await self.session.commit()
                await self.session.refresh(offer)
                return offer
        return None

    async def remove_location(self, offer_id: UUID, location_id: UUID) -> Optional[JobOffer]:
        """
        Remove a location from a job offer's many-to-many relationship.
        """
        stmt = select(JobOffer).where(JobOffer.id == offer_id)
        result = await self.session.execute(stmt)
        offer = result.scalars().first()

        if offer:
            from src.models.lookups import Location
            loc_stmt = select(Location).where(Location.id == location_id)
            loc_result = await self.session.execute(loc_stmt)
            location = loc_result.scalars().first()

            if location and location in offer.locations:
                offer.locations.remove(location)
                await self.session.commit()
                await self.session.refresh(offer)
                return offer
        return None
