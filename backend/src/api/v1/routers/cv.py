import io
import pdfplumber

from docx import Document
from fastapi import APIRouter, UploadFile, HTTPException, status
from sqlalchemy import select

from src.core.db import SessionDep
from src.models.users import UserProfile

router = APIRouter(prefix="/cv", tags=["CV Analysis"])

# Functions to convert PDF and DOCX files to text 
def extract_text_from_pdf(file_bytes: bytes) -> str:
    text = ""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

def extract_text_from_docx(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join([para.text for para in doc.paragraphs])

# Endpoint

@router.post("/upload/{user_id}")
async def upload_cv(user_id: str, file: UploadFile, db: SessionDep):
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
    # Reading a binary file from the forntend
    try:
        content = await file.read()

        # Selecting a parser based on the extention 
        if extension == "pdf":
            extracted_text = extract_text_from_pdf(content)
        else:
            extracted_text = extract_text_from_docx(content)

        if not extracted_text.strip():
            raise ValueError("Could not extract text from file.")
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Error reading file: {str(e)}"
        )
    
    # Writing to database

    # Once we split users into registered and quests,
    # we will implement teature to send guest CVs to Redis (or sth. similar)
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found.")
    
    # Updating the raw_cv fild in the model
    profile.raw_cv = extracted_text

    await db.commit()
    await db.refresh(profile)

    #for frontend
    return {
        "message": "CV has been submitted and processed successfully",
        "user_id": user_id,
        "chars_extracted": len(extracted_text)
    }