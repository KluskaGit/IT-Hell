from typing import Dict, List, Any

from pracuj_pl.helpers import extract_query
from pracuj_pl.schemas import JobOffer


def extract_job_offers(next_data: Dict) -> List[JobOffer]:
    raw_lookups = extract_query(next_data, {"jobOffers"})

    offers = raw_lookups.get("jobOffers", {}).get("groupedOffers")

    result = []
    for offer in offers:
        position_levels = offer.get("positionLevels", [])
        work_modes = offer.get("workModes", [])
        urls = offer.get("offers", [])
        if urls and isinstance(urls[0], Dict):
            url = urls[0].get("offerAbsoluteUri", "")
        else:
            url = ""

        entity = JobOffer(
            title=offer.get("jobTitle", "").strip(),
            technologies=offer.get("technologies", []),
            company=offer.get("companyName","").strip(),
            exp_lvl=position_levels[0].strip() if position_levels else "",
            work_type= work_modes[0].strip() if work_modes else "",
            url=url.strip(),
        )
        result.append(entity)

    return result

def fill_out_offer(next_data: Dict, job_offer: JobOffer) -> None:
    raw_offer: Dict[str, Any] = extract_query(next_data, {"jobOffer"})
    offer: Dict[str, Any] = raw_offer.get("jobOffer", {})
    attributes: Dict[str, Any] = offer.get("attributes", {})
    secondary_attributes: List[Dict[str, Any]] = offer.get("secondaryAttributes", [])
    text_sections: Dict[str, Any] = offer.get("textSections", {})

    # Locations
    workplaces: List[Dict[str, Any]] = attributes.get("workplaces", [])
    locations = []
    for location in workplaces:
        location_name: str = location.get("inlandLocation", {}).get("location", {}).get("name", "").strip()
        locations.append(location_name)

    # Specialization
    spec_first_attr: Dict[str, Any] = secondary_attributes[0] if secondary_attributes else {}
    spec_items = spec_first_attr.get("model", {}).get("items", [])
    spec_details = spec_items[0] if spec_items else {}

    # Description


    job_offer.specialization = spec_details.get("name", "").strip()
    job_offer.locations = locations
    job_offer.description = "Brak"

