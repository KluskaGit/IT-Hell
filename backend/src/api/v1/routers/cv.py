import uuid
from typing import Annotated

from fastapi import APIRouter, UploadFile, HTTPException, status, Depends

from src.services.cv_service import CVService
from src.services.user_profiles_service import UserProfileService
from src.api.v1.deps import get_user_profile_service, get_cv_service
from src.core.exceptions import RecordNotFoundError

router = APIRouter(prefix="/cv", tags=["CV Analysis"])



# Endpoint

@router.post("/upload/{user_id}")
async def upload_cv(
    user_id: uuid.UUID,
    file: UploadFile,
    cv_service: Annotated[CVService, Depends(get_cv_service)]
):
    # File validation
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must have a filename."
        )
        
    extension = file.filename.split(".")[-1].lower()
    if extension not in ["pdf","docx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supported formats are only PDF and DOCX."
        )

    try:
        file_bytes = await file.read()
        chars_extracted, technologies_extracted = await cv_service.process_and_update_cv(user_id, file_bytes, extension)
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
    
    return {
        "message": "CV has been submitted and processed successfully",
        "user_id": str(user_id),
        "chars_extracted": chars_extracted,
        "technologies_extracted": technologies_extracted
    }