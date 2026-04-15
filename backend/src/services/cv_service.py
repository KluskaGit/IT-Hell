import io
import uuid
from typing import List, Tuple
import pdfplumber
from docx import Document

from src.services.user_profiles_service import UserProfileService
from src.services.tech_extractor import TechExtractorService
from src.models.lookups import Technology

class CVService:
    def __init__(self, user_profiles_service: UserProfileService, tech_extractor_service: TechExtractorService):
        self.user_profiles_service = user_profiles_service
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

    async def process_and_update_cv(self, user_id: uuid.UUID, file_bytes: bytes, extension: str) -> Tuple[int, int]:
        """
        Wydobywa tekst z pliku CV, ekstrahuje technologie i aktualizuje profil użytkownika.
        Zwraca tuple: (liczba_wyekstrahowanych_znaków, liczba_znalezionych_technologii).
        """
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

        # Update user profile with CV text and extracted technologies
        await self.user_profiles_service.update_cv(user_id, extracted_text, extracted_technologies)

        return len(extracted_text), len(extracted_technologies)