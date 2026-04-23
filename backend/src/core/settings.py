from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int
    POSTGRES_DB: str

    KEYCLOAK_URL: str = "http://localhost:8080"
    KEYCLOAK_REALM_NAME: str
    KEYCLOAK_CLIENT_ID: str
    KEYCLOAK_ALGORITHM: str

    REDIS_HOST: str
    REDIS_PORT: int
    REDIS_DB: int = 0
    REDIS_PASSWORD: str | None = None
    REDIS_STREAM: str
    REDIS_GROUP: str
    REDIS_CONSUMER: str

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings() # type: ignore