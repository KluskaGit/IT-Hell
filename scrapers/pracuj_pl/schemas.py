from pydantic import BaseModel
from typing import Dict, List, Any

class JobOffer(BaseModel):
    site: str = "https://it.pracuj.pl/"
    title: str
    technologies: List[str]
    company: str
    exp_lvl: str
    work_type: str
    url: str
    locations: List[str]