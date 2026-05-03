import io
from typing import List, Optional
import pdfplumber
from docx import Document

from src.services.tech_extractor import TechExtractorService
from src.models.lookups import Technology

class CVService:
    def __init__(self, tech_extractor_service: TechExtractorService):
        self.tech_extractor_service = tech_extractor_service

    def _extract_text_from_pdf(self, file_bytes: bytes) -> str:
        text = ""
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text

    def _extract_text_from_docx(self, file_bytes: bytes) -> str:
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join([para.text for para in doc.paragraphs])

    async def extract_technologies_from_file(self, file_bytes: bytes, extension: str, filename: Optional[str] = None) -> List[Technology]:
        """
        Extract technologies from CV file without saving to database.
        
        Returns list of Technology objects found in CV file.
        Does not modify user profile or store CV text.
        """
        # Validate filename and extension
        if not filename:
            raise ValueError("File must have a filename.")
        
        if extension not in ["pdf", "docx"]:
            raise ValueError("Supported formats are only PDF and DOCX.")
        
        if extension == "pdf":
            extracted_text = self._extract_text_from_pdf(file_bytes)
        elif extension == "docx":
            extracted_text = self._extract_text_from_docx(file_bytes)
        else:
            raise ValueError("Unsupported file format.")

        if not extracted_text.strip():
            raise ValueError("Could not extract text from file.")

        # Extract technologies from CV text
        extracted_technologies = await self.tech_extractor_service.extract_technologies(extracted_text)

        return extracted_technologies