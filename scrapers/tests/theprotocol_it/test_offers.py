import pytest
from src.theprotocol_it.offers import extract_job_offers, fill_out_offer
from src.schemas import JobOffer

def test_extract_job_offers_theprotocol(theprotocol_main_data):
    offers = extract_job_offers(theprotocol_main_data)
    
    assert isinstance(offers, list)
    assert len(offers) > 0
    
    offer = offers[0]
    assert isinstance(offer, JobOffer)
    assert offer.site == "theprotocol.it"
    assert offer.title == "Project Manager"
    assert offer.technologies == ['Jira', 'Confluence', 'Prince2', 'Scrum', 'PMI']
    assert offer.company == "LOTTOMERKURY sp. z o.o."
    assert offer.exp_lvl == "lead"
    assert offer.work_type == "hybrydowa"
    assert offer.url.startswith("https://theprotocol.it/szczegoly/praca/")
    assert offer.locations == ["Warszawa"]
    assert offer.salary_from == 13000.0
    assert offer.salary_to == 15000.0

def test_fill_out_offer_theprotocol(theprotocol_offer_data):
    # Create a dummy offer to be filled
    job_offer = JobOffer(
        site="test",
        title="test",
        technologies=["test"],
        company="test",
        exp_lvl="test",
        work_type="test",
        url="test"
    )
    
    fill_out_offer(theprotocol_offer_data, job_offer)
    
    assert job_offer.specialization == "Backend"
