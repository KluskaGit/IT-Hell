from src.schemas.job_offers import JobOfferScraperCreate

from worker.normalize.exp_lvls import normalize_experience
from worker.normalize.technologies import normalize_technologies

def normalize_offer(offer: JobOfferScraperCreate) -> None:
    offer.exp_level_name = normalize_experience(offer.exp_level_name)
    offer.technology_names = normalize_technologies(offer.technology_names)