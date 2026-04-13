from typing import Dict, List, Any

from pracuj_pl.helpers import extract_query
from pracuj_pl.schemas import JobOffer

QUERIES = {"jobOffers"}

def extract_job_offers(next_data: Dict) -> JobOffer:
    raw_lookups = extract_query(next_data, QUERIES)

    offers = raw_lookups.get("jobOffers", {}).get("groupedOffers")

    offer: Dict[str, Any] = offers[0]

    position_levels = offer.get("positionLevels", [])
    work_modes = offer.get("workModes", [])
    urls = offer.get("offers", [])
    if urls and isinstance(urls[0], Dict):
        url = urls[0].get("offerAbsoluteUri", "")
        locations = []
        for location in urls:
            location_name = location.get("displayWorkplace", "").split(",")[0].strip()
            locations.append(location_name)
    else:
        url = ""
        locations = []

    entity = JobOffer(
        title=offer.get("jobTitle", "").strip(),
        technologies=offer.get("technologies", []),
        company=offer.get("companyName","").strip(),
        exp_lvl=position_levels[0].strip() if position_levels else "",
        work_type= work_modes[0].strip() if work_modes else "",
        url=url.strip(),
        locations=locations
    )

    return entity

