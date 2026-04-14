from pydantic import BaseModel, ConfigDict, Field
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

class JobOfferFilter(BaseModel):
    skip: int = Field(0, ge=0, description="Liczba rekordów do pominięcia (paginacja)")
    limit: int = Field(100, ge=1, le=100, description="Maksymalna liczba zwróconych rekordów")
    site_ids: Optional[List[UUID]] = Field(None, description="Filtruj po ID portalu (można wiele)")
    company_ids: Optional[List[UUID]] = Field(None, description="Filtruj po ID firmy (można wiele)")
    work_type_ids: Optional[List[UUID]] = Field(None, description="Filtruj po typie pracy (można wiele)")
    specialization_ids: Optional[List[UUID]] = Field(None, description="Filtruj po specjalizacji (można wiele)")
    exp_level_ids: Optional[List[UUID]] = Field(None, description="Filtruj po poziomie doświadczenia (można wiele)")
    title: Optional[str] = Field(None, description="Filtruj po fragmencie tytułu (case-insensitive)")
    salary_from_min: Optional[float] = Field(None, description="Minimalne dolne widełki wynagrodzenia")
    salary_to_max: Optional[float] = Field(None, description="Maksymalne górne widełki wynagrodzenia")
    technology_ids: Optional[List[UUID]] = Field(None, description="Filtruj po identyfikatorach technologii")
    location_ids: Optional[List[UUID]] = Field(None, description="Filtruj po identyfikatorach lokalizacji")

class JobOfferScraperCreate(BaseModel):
    site_name: str
    exp_level_name: str
    company_name: str
    work_type_name: str
    specialization_name: str
    url: str
    title: str
    description: str
    technology_names: List[str] = Field(default_factory=list)
    location_names: List[str] = Field(default_factory=list)
    salary_from: Optional[float] = None
    salary_to: Optional[float] = None