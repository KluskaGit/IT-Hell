import uuid
from pydantic import BaseModel, ConfigDict

class LookupRead(BaseModel):
    id: uuid.UUID
    name: str

    model_config = ConfigDict(from_attributes=True)