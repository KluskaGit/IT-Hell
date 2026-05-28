from src.schemas.job_offers import JobOfferScraperCreate

from worker.normalize import normalize_string, normalize_strings
from worker.normalize.exp_lvls import EXPERIENCE_LEVELS
from worker.normalize.work_types import WORK_TYPES
from worker.normalize.technologies import TECHNOLOGIES

def normalize_offer(offer: JobOfferScraperCreate) -> None:
    offer.title = offer.title.strip()
    offer.company_name = offer.company_name.strip()
    offer.work_type_name = normalize_string(offer.work_type_name, WORK_TYPES)
    offer.exp_level_name = normalize_string(offer.exp_level_name, EXPERIENCE_LEVELS)
    offer.technology_names = normalize_strings(offer.technology_names, TECHNOLOGIES)
    offer.specialization_name = offer.specialization_name.strip()
    offer.location_names = [city.strip().title() for city in offer.location_names]
    offer.url = offer.url.strip()