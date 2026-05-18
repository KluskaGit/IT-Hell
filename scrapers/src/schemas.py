from pydantic import BaseModel
from typing import List, Optional

class JobOffer(BaseModel):
    site: str
    title: str
    technologies: List[str]
    specialization: str = "Other"
    company: str
    exp_lvl: str
    work_type: str
    url: str
    locations: List[str] = []
    salary_from: Optional[float] = None
    salary_to: Optional[float] = None
    description: str = "Brak"