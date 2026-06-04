from typing import Dict
from worker.core.deps import get_job_offers_service
from worker.pipeline import normalize_offer

from src.core.exceptions import DiscardException
from src.schemas.job_offers import JobOfferScraperCreate


async def save_job_offer_to_db(payload: Dict) -> None:
    async with get_job_offers_service() as service:
        try:
            site = payload["site"]
            title = payload["title"]
            technologies = payload["technologies"]
            specialization = payload["specialization"]
            company = payload["company"]
            exp_lvl = payload["exp_lvl"]
            work_type = payload["work_type"]
            url = payload["url"]
            locations = payload["locations"]
            salary_from = payload.get("salary_from")
            salary_to = payload.get("salary_to")
            description = payload["description"]
            publication_date = payload.get("publication_date")
            expiration_date = payload.get("expiration_date")

            offer = JobOfferScraperCreate(
                site_name=site,
                title=title,
                technology_names=technologies,
                specialization_name=specialization,
                company_name=company,
                exp_level_name=exp_lvl,
                work_type_name=work_type,
                url=url,
                description=description,
                location_names=locations,
                salary_from=salary_from,
                salary_to=salary_to,
                publication_date=publication_date,
                expiration_date=expiration_date
            )
            # Normalization process
            normalize_offer(offer)
            
            await service.create_from_scraper(offer)
        except KeyError as e:
            raise KeyError(f"Missing required field: {e}")
        except DiscardException as e:
            print(f"skipping offer, {e}")
            pass
