from typing import Dict, Type
from worker.core.deps import get_job_offers_service

from src.core.exceptions import DiscardException


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
            description = payload["description"]

            await service.create_from_scraper(
                site_name=site,
                title=title,
                technology_names=technologies,
                specialization_name=specialization,
                company_name=company,
                exp_level_name=exp_lvl,
                work_type_name=work_type,
                url=url,
                description=description,
                location_names=locations
            )
        except KeyError as e:
            raise DiscardException(f"Missing required field: {e}")
        except DiscardException as e:
            raise e
