import uuid
from pydantic import BaseModel, ConfigDict

class ExperienceLevelRead(BaseModel):
    id: uuid.UUID
    exp_level: str

    model_config = ConfigDict(from_attributes=True)

class WorkTypeRead(BaseModel):
    id: uuid.UUID
    work_type: str

    model_config = ConfigDict(from_attributes=True)

class SiteUrlRead(BaseModel):
    id: uuid.UUID
    url: str

    model_config = ConfigDict(from_attributes=True)

class CompanyNameRead(BaseModel):
    id: uuid.UUID
    company_name: str

    model_config = ConfigDict(from_attributes=True)

class LocationRead(BaseModel):
    id: uuid.UUID
    city: str

    model_config = ConfigDict(from_attributes=True)

class SpecializationRead(BaseModel):
    id: uuid.UUID
    specialization: str

    model_config = ConfigDict(from_attributes=True)