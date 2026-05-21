# config.py — Central configuration using Pydantic BaseSettings
# instead of scattering secrets and settings everywhere, everything comes from one place
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

# config.py is at: backend/app/core/config.py
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

class Settings(BaseSettings):
    # app
    APP_NAME: str = "AI Interview Coach API"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # db
    DATABASE_URL: str

    # auth
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # redis / celery
    REDIS_URL: str = "redis://localhost:6379/0"

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",   # silently ignore any .env keys not listed above
    )


@lru_cache
def get_settings():
    return Settings()

