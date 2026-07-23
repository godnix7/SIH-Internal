from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Yatri Shield API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    API_BASE_URL: str = "https://api.yatrishield.gov.in"
    
    # Database
    POSTGRES_USER: str = "yatrishield"
    POSTGRES_PASSWORD: str = "password123"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "yatrishield_dev"
    
    @property
    def async_database_url(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def sync_database_url(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_extremely_secret_key_for_jwt"
    ALGORITHM: str = "HS256" # For dev. Prod uses ES256
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    SUPER_ADMIN_EMAIL: str = "admin@yatrishield.gov.in"
    
    # Twilio
    TWILIO_ACCOUNT_SID: str = "mock_sid"
    TWILIO_AUTH_TOKEN: str = "mock_token"
    TWILIO_PHONE_NUMBER: str = "+1234567890"
    
    # SMS Cryptography
    SMS_ENCRYPTION_KEY: str = "0123456789abcdef0123456789abcdef"
    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
