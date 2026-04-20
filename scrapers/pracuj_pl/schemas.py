from pydantic import BaseModel
from typing import List

class JobOffer(BaseModel):
    site: str = "https://it.pracuj.pl/"
    title: str
    technologies: List[str]
    specialization: str = "Other"
    company: str
    exp_lvl: str
    work_type: str
    url: str
    locations: List[str] = []
    description: str = ""