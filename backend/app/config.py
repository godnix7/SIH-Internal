from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Yatri Shield API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    API_BASE_URL: str = "https://api.yatrishield.gov.in"
    
    # Database — Render provides a single DATABASE_URL.
    # For local dev, the individual POSTGRES_* vars are used as fallback.
    DATABASE_URL: str = ""
    POSTGRES_USER: str = "yatrishield"
    POSTGRES_PASSWORD: str = "password123"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "yatrishield_dev"
    
    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            # Render uses postgres://, SQLAlchemy async needs postgresql+asyncpg://
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def sync_database_url(self) -> str:
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql://", 1)
            return url
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_extremely_secret_key_for_jwt"
    ALGORITHM: str = "HS256" # For dev. Prod uses ES256
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    SUPER_ADMIN_EMAIL: str = "admin@yatrishield.gov.in"
    SUPER_ADMIN_PASSWORD: str | None = None
    
    # Twilio (used by Voice AI emergency calling, not for OTP)
    TWILIO_ACCOUNT_SID: str = "mock_sid"
    TWILIO_AUTH_TOKEN: str = "mock_token"
    TWILIO_PHONE_NUMBER: str = "+1234567890"
    
    # SMS Webhook Encryption Key
    SMS_ENCRYPTION_KEY: str = "mock_sms_key_for_dev_only_32bytes"
    
    # Admin seeding (set in Render env vars to auto-seed on first deploy)
    SEED_ADMIN_EMAIL: str = ""
    SEED_ADMIN_PASSWORD: str = ""
    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()

import os
if os.environ.get("ENVIRONMENT") == "production":
    if settings.SECRET_KEY == "CHANGE_ME_IN_PRODUCTION_extremely_secret_key_for_jwt":
        raise ValueError("CRITICAL: SECRET_KEY is using the default value in production. Set SECRET_KEY in your environment variables.")


