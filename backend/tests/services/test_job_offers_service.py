import pytest
from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

from src.services.job_offers_service import JobOffersService
from src.core.exceptions import RecordNotFoundError, ValidationError, RecordAlreadyExistsError
from src.models.job_offers import JobOffer
from src.schemas.job_offers import JobOfferScraperCreate
from src.models.lookups import Site, ExperienceLevel, Company, WorkType, Specialization


@pytest.mark.asyncio
async def test_get_by_id_success():
    # 1. Przygotowanie mocków
    mock_repo = AsyncMock()
    mock_lookups = AsyncMock()
    service = JobOffersService(repo=mock_repo, lookups_service=mock_lookups)

    # 2. Definiowanie zachowania mocka
    offer_id = uuid4()
    mock_offer = JobOffer(id=offer_id, title="Test Offer")
    mock_repo.get_by_id.return_value = mock_offer

    # 3. Wywołanie testowanej metody
    result = await service.get_by_id(offer_id)

    # 4. Aserty
    assert result.id == offer_id
    assert result.title == "Test Offer"
    mock_repo.get_by_id.assert_called_once_with(offer_id)


@pytest.mark.asyncio
async def test_get_by_id_not_found():
    mock_repo = AsyncMock()
    mock_lookups = AsyncMock()
    service = JobOffersService(repo=mock_repo, lookups_service=mock_lookups)

    offer_id = uuid4()
    mock_repo.get_by_id.return_value = None

    # Sprawdzenie czy wywołanie rzuca odpowiedni wyjątek
    with pytest.raises(RecordNotFoundError):
        await service.get_by_id(offer_id)


@pytest.mark.asyncio
async def test_filter_invalid_salary():
    mock_repo = AsyncMock()
    mock_lookups = AsyncMock()
    service = JobOffersService(repo=mock_repo, lookups_service=mock_lookups)

    # Sprawdzamy, czy przy próbie filtrowania z pensją min > max rzucony zostanie błąd walidacji
    with pytest.raises(ValidationError, match="salary_from_min cannot be greater than salary_to_max"):
        await service.filter(salary_from_min=10000, salary_to_max=5000)

    # Upewniamy się, że repozytorium nigdy nie zostało wywołane
    mock_repo.filter.assert_not_called()


@pytest.mark.asyncio
async def test_create_validation_error_empty_title():
    mock_repo = AsyncMock()
    mock_lookups = AsyncMock()
    service = JobOffersService(repo=mock_repo, lookups_service=mock_lookups)

    # Sprawdzamy czy serwis blokuje utworzenie oferty z pustym tytułem
    with pytest.raises(ValidationError, match="Title is required"):
        await service.create(
            site_id=uuid4(),
            exp_level_id=uuid4(),
            company_id=uuid4(),
            work_type_id=uuid4(),
            specialization_id=uuid4(),
            url="https://example.com",
            title="   ",  # Pusty/białe znaki
            description="Some description"
        )


@pytest.mark.asyncio
async def test_create_already_exists():
    mock_repo = AsyncMock()
    mock_lookups = AsyncMock()
    service = JobOffersService(repo=mock_repo, lookups_service=mock_lookups)

    # Repozytorium udaje, że znalazło już taką ofertę w bazie
    mock_repo.get_by_url.return_value = JobOffer(id=uuid4(), title="Existing Offer")

    with pytest.raises(RecordAlreadyExistsError, match="already exists"):
        await service.create(
            site_id=uuid4(),
            exp_level_id=uuid4(),
            company_id=uuid4(),
            work_type_id=uuid4(),
            specialization_id=uuid4(),
            url="https://example.com",
            title="Backend Developer",
            description="Super Job"
        )


@pytest.mark.asyncio
async def test_create_from_scraper_success():
    mock_repo = AsyncMock()
    mock_lookups = AsyncMock()
    service = JobOffersService(repo=mock_repo, lookups_service=mock_lookups)

    # Symulacja danych przychodzących ze scrapera
    scraper_data = JobOfferScraperCreate(
        site_name="JustJoinIT",
        exp_level_name="Mid",
        company_name="TestCompany",
        work_type_name="B2B",
        specialization_name="Backend",
        url="https://test.com/offer1",
        title="Python Dev",
        description="Desc",
        technology_names=["Python", "FastAPI"],
        location_names=["Warsaw"],
        publication_date=datetime(2024, 5, 28),
        expiration_date=datetime(2024, 6, 28)
    )

    # Zapewniamy przejście walidacji unikalności
    mock_repo.get_by_url.return_value = None

    # Tworzymy generyczny mock obiektu Lookup, który będzie zwracany dla każdej słownikowej wartości (Site, Tech, itd.)
    mock_lookup = AsyncMock()
    mock_lookup.id = uuid4()
    
    # Ustawiamy zachowanie lookups_service, by za każdym razem zwracało nasz zmockowany obiekt z ID
    mock_lookups.get_by_name.return_value = mock_lookup

    # Repozytorium ostatecznie zwraca świeżo stworzoną ofertę
    mock_created_offer = JobOffer(id=uuid4(), title="Python Dev")
    mock_repo.create_with_relationships.return_value = mock_created_offer

    # Wywołanie testowanej funkcji
    result = await service.create_from_scraper(scraper_data)

    # Aserty
    assert result.title == "Python Dev"
    
    # Liczymy, ile razy system próbował rozwiązać nazwę na ID (5 głównych kategorii + 2 technologie + 1 lokalizacja = 8)
    assert mock_lookups.get_by_name.call_count == 8
    
    # Upewniamy się, że finalnie zapisano w bazie w jednej transakcji
    mock_repo.create_with_relationships.assert_called_once()


@pytest.mark.asyncio
async def test_delete_not_found():
    mock_repo = AsyncMock()
    service = JobOffersService(repo=mock_repo, lookups_service=AsyncMock())
    mock_repo.delete.return_value = False

    with pytest.raises(RecordNotFoundError):
        await service.delete(uuid4())
