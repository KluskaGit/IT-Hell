import uuid
from typing import Annotated, List

from fastapi import APIRouter, UploadFile, HTTPException, status, Depends

from src.services.cv_service import CVService
from src.api.v1.deps import get_cv_service, get_current_user
from src.core.exceptions import RecordNotFoundError
from src.schemas.lookups import LookupRead
from src.models.users import User

router = APIRouter(prefix="/cv", tags=["CV Analysis"])



# Endpoint

@router.post("/upload", response_model=List[LookupRead])
async def upload_cv(
    file: UploadFile,
    current_user: Annotated[User, Depends(get_current_user)],
    cv_service: Annotated[CVService, Depends(get_cv_service)]
):
    """Upload CV and extract technologies.
    
    Returns extracted technologies from CV text.
    User confirms selection via PUT /users/me/profile with technology_ids.
    """
    try:
        file_bytes = await file.read()
        extension = file.filename.split(".")[-1].lower() if file.filename else ""
        raw_cv_text, extracted_technologies = await cv_service.process_and_update_cv(
            current_user.id_keycloak, file_bytes, extension, filename=file.filename
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except RecordNotFoundError:
        raise HTTPException(status_code=404, detail="User profile not found.")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file: {str(e)}"
        )
    
    # Convert Technology ORM objects to LookupRead schema
    return [
        LookupRead.model_validate(tech)
        for tech in extracted_technologies
    ]