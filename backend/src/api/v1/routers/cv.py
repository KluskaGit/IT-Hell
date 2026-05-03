from typing import Annotated, List

from fastapi import APIRouter, UploadFile, HTTPException, status, Depends

from src.services.cv_service import CVService
from src.api.v1.deps import get_cv_service
from src.schemas.lookups import LookupRead

router = APIRouter(prefix="/cv", tags=["CV Analysis"])



# Endpoint

@router.post("/upload", response_model=List[LookupRead])
async def upload_cv(
    file: UploadFile,
    cv_service: Annotated[CVService, Depends(get_cv_service)]
):
    """Upload CV and extract technologies.
    
    Returns extracted technologies from CV file without storing any user data.
    """
    try:
        file_bytes = await file.read()
        extension = file.filename.split(".")[-1].lower() if file.filename else ""
        extracted_technologies = await cv_service.extract_technologies_from_file(
            file_bytes, extension, filename=file.filename
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
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