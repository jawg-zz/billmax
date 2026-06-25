from typing import Any

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
    NOTIFICATION_EMAIL: str = ""

    PORTAL_URL: str = ""


    def load_from_db(self, db_config: dict) -> None:
        """Override settings from a DB OrgSettings config dict.

        Handles both flat keys (``mpesa_consumer_key``) and nested
        paths (``mpesa.consumer_key``) since the frontend sends
        settings as nested objects.
        """
        def _get(config: dict, key: str) -> Any:
            if key in config:
                return config[key]
            # Try dotted path: "mpesa.consumer_key" → config["mpesa"]["consumer_key"]
            if "." in key:
                parts = key.split(".")
                val = config
                for p in parts:
                    if isinstance(val, dict) and p in val:
                        val = val[p]
                    else:
                        return None
                return val
            return None

        mapping = {
            "app_name": "APP_NAME",
            "mpesa.consumer_key": "MPESA_CONSUMER_KEY",
            "mpesa.consumer_secret": "MPESA_CONSUMER_SECRET",
            "mpesa.passkey": "MPESA_PASSKEY",
            "mpesa.shortcode": "MPESA_SHORTCODE",
            "mpesa.initiator_name": "MPESA_INITIATOR_NAME",
            "mpesa.security_credential": "MPESA_SECURITY_CREDENTIAL",
            "mpesa.environment": "MPESA_ENVIRONMENT",
            "mpesa.callback_url": "MPESA_CALLBACK_URL",
            "provisioning.backend": "PROVISIONING_BACKEND",
            "provisioning.routeros_host": "ROUTEROS_HOST",
            "provisioning.routeros_port": "ROUTEROS_PORT",
            "provisioning.routeros_username": "ROUTEROS_USERNAME",
            "provisioning.routeros_password": "ROUTEROS_PASSWORD",
            "provisioning.radius_db_url": "RADIUS_DATABASE_URL",
            "email.smtp_host": "SMTP_HOST",
            "email.smtp_port": "SMTP_PORT",
            "email.smtp_user": "SMTP_USER",
            "email.smtp_password": "SMTP_PASSWORD",
            "email.from_address": "SMTP_FROM",
            "whatsapp.enabled": "WHATSAPP_ENABLED",
            "whatsapp.api_url": "WHATSAPP_API_URL",
            "whatsapp.api_key": "WHATSAPP_API_KEY",
            "portal_url": "PORTAL_URL",
            "notification_email": "NOTIFICATION_EMAIL",
        }
        for db_key, attr in mapping.items():
            value = _get(db_config, db_key)
            if value is not None and value != "":
                try:
                    setattr(self, attr, value)
                except ValueError:
                    import logging
                    logging.getLogger("billmax").warning(
                        "load_from_db: skipping '%s' → '%s' — not defined on Settings model",
                        db_key, attr,
                    )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
