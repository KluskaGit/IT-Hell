from typing import Annotated, List

from fastapi import APIRouter, UploadFile, HTTPException, status, Depends

from src.services.cv_service import CVService
from src.api.v1.deps import get_cv_service
from src.schemas.lookups import LookupRead

router = APIRouter(prefix="/cv", tags=["CV Analysis"])



# Endpoint

@router.post(
    "/upload",
    response_model=List[LookupRead],
    summary="Upload CV and extract technologies",
    responses={
        200: {
            "description": "List of technologies successfully extracted from the CV",
            "content": {
                "application/json": {
                    "example": [
                        {"id": "xyz12345-e89b-12d3-a456-426614174000", "name": "Python"},
                        {"id": "abc12345-e89b-12d3-a456-426614174000", "name": "Docker"}
                    ]
                }
            }
        },
        422: {"description": "Validation Error (e.g., unsupported file format, empty file)"},
        500: {"description": "Internal Server Error during file processing"}
    }
)
async def upload_cv(
    file: UploadFile,
    cv_service: Annotated[CVService, Depends(get_cv_service)]
):
    """
    Uploads a CV document (`.pdf` or `.docx`) and automatically extracts matching technologies.
    
    **Process:**
    1. Accepts a file upload (`multipart/form-data`).
    2. Extracts raw text based on the file extension.
    3. Uses fuzzy matching to find known technologies from the database.
    
    *Note: This endpoint is completely stateless and privacy-friendly. It **does not** store the user's CV file or its content in the database.*
    """
    try:
        file_bytes = await file.read()
        extension = file.filename.split(".")[-1].lower() if file.filename else ""
        extracted_technologies = await cv_service.extract_technologies_from_file(
            file_bytes, extension, filename=file.filename
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
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