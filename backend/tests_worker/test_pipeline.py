from worker.pipeline import normalize_offer
from src.schemas.job_offers import JobOfferScraperCreate

def test_normalize_offer():
    offer = JobOfferScraperCreate(
        site_name=" test_site ",
        exp_level_name=" junior ",
        company_name=" test_company ",
        work_type_name=" remote ",
        specialization_name=" backend ",
        url=" http://example.com/job ",
        title="  Software Engineer ",
        description="desc",
        technology_names=["reactjs", "python"],
        location_names=[" warsaw ", "KRAKÓW"],
        salary_from=10000,
        salary_to=15000
    )
    
    normalize_offer(offer)
    
    assert offer.title == "Software Engineer"
    assert offer.company_name == "test_company"
    assert offer.exp_level_name == "Junior"
    assert offer.work_type_name == "Zdalna"
    assert offer.specialization_name == "backend" # Not normalized in pipeline.py (only stripped)
    assert offer.url == "http://example.com/job"
    assert "React" in offer.technology_names
    assert "Python" in offer.technology_names
    assert "Warsaw" in offer.location_names
    assert "Kraków" in offer.location_names
