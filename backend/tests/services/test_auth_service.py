import pytest
import jwt
from unittest.mock import AsyncMock, patch, MagicMock
from uuid import uuid4

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from src.services.auth_service import AuthService
from src.models.users import User


@pytest.mark.asyncio
@patch("src.services.auth_service.jwt.decode")
@patch("src.services.auth_service.PyJWKClient")
async def test_authorize_success(mock_jwk_client_class, mock_jwt_decode):
    # 1. Konfiguracja mocka dla PyJWKClient (zwracanie fałszywego klucza publicznego)
    mock_jwk_client = MagicMock()
    mock_signing_key = MagicMock()
    mock_signing_key.key = "fake-public-key"
    mock_jwk_client.get_signing_key_from_jwt.return_value = mock_signing_key
    mock_jwk_client_class.return_value = mock_jwk_client
    
    # 2. Konfiguracja mocka dla jwt.decode (symulacja udanego zdekodowania)
    user_uuid = uuid4()
    mock_jwt_decode.return_value = {
        "sub": str(user_uuid), 
        "email": "test@example.com",
        "given_name": "Test",
        "family_name": "User"
    }
    
    # 3. Podpinamy zmockowane repozytorium użytkowników i zwracamy "bazowego" usera
    mock_user_repo = AsyncMock()
    mock_user_repo.get_user_by_email.return_value = User(id_keycloak=user_uuid, email="test@example.com")
    service = AuthService(user_repository=mock_user_repo)
    
    # 4. Wywołanie metody z obiektem HTTPAuthorizationCredentials
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="fake_token")
    result = await service.authorize(credentials)
    
    # 5. Sprawdzenie zachowania (serwis zawraca obiekt User)
    assert result.email == "test@example.com"
    assert result.id_keycloak == user_uuid
    mock_jwt_decode.assert_called_once()


@pytest.mark.asyncio
@patch("src.services.auth_service.jwt.decode")
@patch("src.services.auth_service.PyJWKClient")
async def test_authorize_expired(mock_jwk_client_class, mock_jwt_decode):
    mock_jwk_client_class.return_value = MagicMock()

    # Symulacja przeterminowanego tokena
    mock_jwt_decode.side_effect = jwt.ExpiredSignatureError("Token has expired")
    
    service = AuthService(user_repository=AsyncMock())
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="expired_token")
    
    with pytest.raises(HTTPException) as exc_info:
        await service.authorize(credentials)
        
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Token has expired"