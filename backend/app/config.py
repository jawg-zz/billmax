from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "BillMax"
    DEBUG: bool = False
    DATABASE_URL: str = "postgresql+asyncpg://billmax:billmax@localhost:5432/billmax"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "change-me-in-production"
    JWT_SECRET: str = "change-me-in-production"
    JWT_LIFETIME_SECONDS: int = 3600
    JWT_REFRESH_LIFETIME_SECONDS: int = 604800
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    SENTRY_DSN: str | None = None

    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@billmax.ke"

    MPESA_CONSUMER_KEY: str = ""
    MPESA_CONSUMER_SECRET: str = ""
    MPESA_PASSKEY: str = ""
    MPESA_SHORTCODE: str = ""
    MPESA_INITIATOR_NAME: str = ""
    MPESA_SECURITY_CREDENTIAL: str = ""
    MPESA_ENVIRONMENT: str = "sandbox"
    MPESA_CALLBACK_URL: str = ""

    PROVISIONING_BACKEND: str = "mock"

    ROUTEROS_HOST: str = ""
    ROUTEROS_PORT: int = 8728
    ROUTEROS_USERNAME: str = "admin"
    ROUTEROS_PASSWORD: str = ""

    RADIUS_DATABASE_URL: str = ""

    WHATSAPP_ENABLED: bool = False
    WHATSAPP_API_URL: str = ""
    WHATSAPP_API_KEY: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
