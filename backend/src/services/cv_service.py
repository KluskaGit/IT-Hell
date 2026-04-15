import io
import uuid
import pdfplumber
from docx import Document

from src.services.user_profiles_service import UserProfileService

class CVService:
    def __init__(self, user_profiles_service: UserProfileService):
        self.user_profiles_service = user_profiles_service

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

    async def process_and_update_cv(self, user_id: uuid.UUID, file_bytes: bytes, extension: str) -> int:
        """
        Wydobywa tekst z pliku CV i wywołuje serwis profilu użytkownika do aktualizacji bazy.
        Zwraca liczbę wyekstrahowanych znaków.
        """
        if extension == "pdf":
            extracted_text = self._extract_text_from_pdf(file_bytes)
        elif extension == "docx":
            extracted_text = self._extract_text_from_docx(file_bytes)
        else:
            raise ValueError("Unsupported file format.")

        if not extracted_text.strip():
            raise ValueError("Could not extract text from file.")

        await self.user_profiles_service.update_cv(user_id, extracted_text)

        return len(extracted_text)