from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from uuid import UUID

class LookupBase(BaseModel):
    id: UUID
    name: str
    
    model_config = ConfigDict(from_attributes=True)

class JobOfferResponse(BaseModel):
    id: UUID
    url: str
    title: str
    description: str
    salary_from: Optional[float] = None
    salary_to: Optional[float] = None
    
    site: Optional[LookupBase] = None
    company: Optional[LookupBase] = None
    work_type: Optional[LookupBase] = None
    exp_level: Optional[LookupBase] = None
    specialization: Optional[LookupBase] = None
    
    technologies: List[LookupBase] = []
    locations: List[LookupBase] = []

    model_config = ConfigDict(from_attributes=True)