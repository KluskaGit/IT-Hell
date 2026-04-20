import jwt
import uuid

from typing import Dict, Any

from jwt import PyJWKClient

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from src.repositories.users import UserRepository
from src.schemas.users import UserCreate
from src.models.users import User

from src.core.settings import settings


class AuthService:

    def __init__(self, user_repository: UserRepository):
        self.user_repo = user_repository
        certs_url = f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM_NAME}/protocol/openid-connect/certs"
        self.jwks_client = PyJWKClient(certs_url)

    async def check_or_create_user(self, payload: Dict[str, Any]) -> User: 
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="Email claim missing in token")

        existing_user = await self.user_repo.get_user_by_email(email)

        if not existing_user:
            id_keycloak_str = payload.get("sub")
            
            if not id_keycloak_str:
                raise HTTPException(status_code=401, detail="Subject (sub) claim missing in token")
            try:
                id_keycloak = uuid.UUID(id_keycloak_str)
            except ValueError:
                raise HTTPException(status_code=401, detail="Invalid Keycloak ID format")

            first_name = payload.get("given_name")
            last_name = payload.get("family_name")

            user = UserCreate(
                id_keycloak=id_keycloak,
                email=email, 
                first_name=first_name,
                last_name=last_name,
            )

            new_user = await self.user_repo.create_user(user)
            return new_user

        return existing_user
    
    async def authorize(self, credentials: HTTPAuthorizationCredentials) -> User:

        token = credentials.credentials
        try:
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[settings.KEYCLOAK_ALGORITHM],
                audience=settings.KEYCLOAK_CLIENT_ID,
                issuer=f"{settings.KEYCLOAK_URL}/realms/{settings.KEYCLOAK_REALM_NAME}",
            )
  
            user = await self.check_or_create_user(payload=payload)
            return user

        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
        except jwt.PyJWTError as e:
            raise HTTPException(status_code=500, detail=f"Token verification error, {e}")

        