import pytest
from src.pracuj_pl.offers import extract_job_offers, fill_out_offer
from src.schemas import JobOffer

def test_extract_job_offers_pracuj_pl(pracuj_pl_main_data):
    offers = extract_job_offers(pracuj_pl_main_data)
    
    assert isinstance(offers, list)
    assert len(offers) > 0
    
    offer = offers[0]
    assert isinstance(offer, JobOffer)
    assert offer.site == "Pracuj.pl"
    assert offer.title == "Administrator / Administratorka systemów IT"
    assert offer.technologies == ['Windows Server', 'MacOS']
    assert offer.company == '"UMO" sp. z o.o.'
    assert offer.exp_lvl == "Specjalista / Specjalistka (mid / Regular)"
    assert offer.work_type == "Praca stacjonarna"
    assert offer.url.startswith("https://www.pracuj.pl/praca/")

def test_fill_out_offer_pracuj_pl(pracuj_pl_offer_data):
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
    
    fill_out_offer(pracuj_pl_offer_data, job_offer)
    
    # Assertions based on typical PracujPL offer structure
    assert isinstance(job_offer.locations, list)
    assert len(job_offer.locations) > 0
    assert job_offer.locations == ["Warszawa"]
    assert job_offer.specialization == "Backend"
    assert job_offer.salary_from == 95.0
    assert job_offer.salary_to == 140.0
    # salary might be None depending on the mock, but we check if extraction logic ran
    # If the mock has salary, we can assert specific values if we knew them.
