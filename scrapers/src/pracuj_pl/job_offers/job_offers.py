from typing import Dict, List, Any

from src.helpers import extract_query
from src.schemas import JobOffer


def extract_job_offers(next_data: Dict) -> List[JobOffer]:
    raw_lookups = extract_query(next_data, {"jobOffers"})

    offers = raw_lookups.get("jobOffers", {}).get("groupedOffers")
    no_record = "Other"

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
            title=offer.get("jobTitle", "No title").strip(),
            technologies=offer.get("technologies", [no_record]),
            company=offer.get("companyName",no_record).strip(),
            exp_lvl=position_levels[0].strip() if position_levels else no_record,
            work_type= work_modes[0].strip() if work_modes else no_record,
            url=url.strip(),
        )
        result.append(entity)

    return result

def fill_out_offer(next_data: Dict, job_offer: JobOffer) -> None:
    raw_offer: Dict[str, Any] = extract_query(next_data, {"jobOffer"})
    offer: Dict[str, Any] = raw_offer.get("jobOffer", {})
    attributes: Dict[str, Any] = offer.get("attributes", {})
    secondary_attributes: List[Dict[str, Any]] = offer.get("secondaryAttributes", [])
    #text_sections: Dict[str, Any] = offer.get("textSections", {})

    no_record = "Other"
    # Locations
    workplaces: List[Dict[str, Any]] = attributes.get("workplaces", [])
    locations = []
    for location in workplaces:
        location_name: str = location.get("inlandLocation", {}).get("location", {}).get("name", "").strip()
        locations.append(location_name)

    # Salary
    employment = attributes.get("employment", {})
    typesOfContracts = employment.get("typesOfContracts", [])

    salary = {}
    for contract in typesOfContracts: 
        if s:=contract.get("salary", {}):
            salary = s
            break

    # Specialization
    spec_details = {}
    for attr in secondary_attributes:
        if attr.get("code") == "it-specializations":
            spec_items = attr.get("model", {}).get("items", [])
            spec_details = spec_items[0] if spec_items else {}
            break

    job_offer.specialization = spec_details.get("name", "").strip() if spec_details else no_record
    job_offer.locations = locations
    if salary:
        job_offer.salary_from = salary.get("from")
        job_offer.salary_to = salary.get("to")
    job_offer.description = "None"

