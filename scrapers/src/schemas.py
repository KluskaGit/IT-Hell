from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

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
    publication_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None

    model_config = ConfigDict(validate_assignment=True)
