import json
from typing import Dict, List, Any

from src.schemas import JobOffer



def extract_job_offers(next_data: Dict) -> List[JobOffer]:

    try:
        raw_offers: List[Dict] = next_data["props"]["pageProps"]["offersResponse"]["offers"]

    except KeyError as e:
        raise KeyError(f"Invalid data structure, {e}")
    
    job_offers: List[JobOffer] = []

    no_record = "Other"

    for offer in raw_offers:

        # Experience level
        exp_lvl = no_record
        for exp in offer.get("positionLevels", []):
            if value:=exp.get("value"):
                exp_lvl = value
                break

        # Locations
        locations: List[str] = []
        for location in offer.get("workplace", []):
            city = location.get("city")
            if city:
                locations.append(city)

        # Salaries
        salary: Dict[str, Any] = {}
        for contract in offer.get("typesOfContracts", []):
            if s:=contract.get("salary"):
                salary = s

        workModes = offer.get("workModes", [])
        entity = JobOffer(
            site = "theprotocol.it",
            title = offer.get("title", "No title").strip(),
            technologies = offer.get("technologies", [no_record]),
            company = offer.get("employer", no_record).strip(),
            exp_lvl = exp_lvl,
            work_type = workModes[0] if workModes else no_record,
            url = f"https://theprotocol.it/szczegoly/praca/{offer.get("offerUrlName")}",
            locations = locations,
            salary_from = salary.get("from"),
            salary_to = salary.get("to"),
        )

        job_offers.append(entity)

    return job_offers


def fill_out_offer(next_data: Dict, job_offer: JobOffer) -> None:

    try:
        raw_offer = next_data["props"]["pageProps"]["offer"]
    except KeyError as e:
        raise KeyError(f"Invalid data structure, {e}")
    
    # Specialization
    no_record = "Other"
    speciazlization = no_record
    if attrs := raw_offer.get("attributes"):
        for spec in attrs.get("specializations", []):
            if spec:
                speciazlization = spec.get("name", no_record)
                break

    job_offer.specialization = speciazlization