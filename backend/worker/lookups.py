from typing import Dict, Type
from worker.core.deps import get_lookups_service

from src.services.lookups_service import LookupsService
from src.core.exceptions import RecordAlreadyExistsError
from src.models.lookups import (
    ExperienceLevel,
    Site,
    Company,
    WorkType,
    Location,
    Specialization,
    Technology,
    Lookup
)

MAPPING_MODELS: Dict[str, Type[Lookup]] = {
    "workModes": WorkType,
    "itSpecializations": Specialization,
    "itTechnologies": Technology, 
    "positionLevels": ExperienceLevel,
}
async def save_lookups_to_db(payload: Dict) -> None:
    async with get_lookups_service() as service:
        for key in payload:
            model = MAPPING_MODELS.get(key)

            if model:
                for item in payload[key]:
                    try:
                        await service.add(model, item)
                    except RecordAlreadyExistsError:
                        pass
