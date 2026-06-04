import pytest
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from src.services.cv_service import CVService
from src.models.lookups import Technology


@pytest.mark.asyncio
async def test_extract_technologies_from_pdf_success():
    # 1. Przygotowujemy mock zależności
    mock_tech_extractor = AsyncMock()
    service = CVService(tech_extractor_service=mock_tech_extractor)
    
    # Symulujemy, że extractor znalazł 2 technologie w wyciągniętym tekście
    tech1_id = uuid4()
    tech2_id = uuid4()
    mock_tech_extractor.extract_technologies.return_value = [
        Technology(id=tech1_id, name="Python"),
        Technology(id=tech2_id, name="PostgreSQL")
    ]
    
    # Mockujemy wewnętrzną metodę wyciągającą tekst z PDF by ominąć parsowanie surowych bajtów
    with patch.object(service, '_extract_text_from_pdf', return_value="Dummy PDF text") as mock_extract_pdf:
        # 2. Wykonujemy testowaną akcję
        result = await service.extract_technologies_from_file(
            file_bytes=b"fake-pdf-bytes", 
            extension="pdf", 
            filename="cv.pdf"
        )
        
        # 3. Sprawdzamy, czy wywołano odpowiednie metody i przekazano poprawne argumenty
        mock_extract_pdf.assert_called_once_with(b"fake-pdf-bytes")
        mock_tech_extractor.extract_technologies.assert_called_once_with("Dummy PDF text")
        
        # 4. Sprawdzamy ostateczny wynik
        assert len(result) == 2
        assert result[0].name == "Python"
        assert result[1].name == "PostgreSQL"


@pytest.mark.asyncio
async def test_extract_technologies_missing_filename():
    mock_tech_extractor = AsyncMock()
    service = CVService(tech_extractor_service=mock_tech_extractor)
    
    with pytest.raises(ValueError, match="File must have a filename."):
        await service.extract_technologies_from_file(
            file_bytes=b"data", 
            extension="pdf", 
            filename=None
        )


@pytest.mark.asyncio
async def test_extract_technologies_unsupported_extension():
    mock_tech_extractor = AsyncMock()
    service = CVService(tech_extractor_service=mock_tech_extractor)
    
    with pytest.raises(ValueError, match="Supported formats are only PDF and DOCX."):
        await service.extract_technologies_from_file(
            file_bytes=b"data", 
            extension="txt", 
            filename="cv.txt"
        )


@pytest.mark.asyncio
async def test_extract_technologies_empty_text():
    mock_tech_extractor = AsyncMock()
    service = CVService(tech_extractor_service=mock_tech_extractor)
    
    with patch.object(service, '_extract_text_from_docx', return_value="   "):
        with pytest.raises(ValueError, match="Could not extract text from file."):
            await service.extract_technologies_from_file(
                file_bytes=b"fake-docx-bytes", 
                extension="docx", 
                filename="cv.docx"
            )