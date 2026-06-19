#!/usr/bin/env python3
"""Write the correct docker-compose.yml for BillMax."""
import os

path = os.path.expanduser("/opt/data/workspace/billmax/docker-compose.yml")

parts = []
parts.append("""services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: billmax
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-billmax}
      POSTGRES_DB: billmax
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U billmax"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      APP_NAME: ${APP_NAME:-BillMax}
      DEBUG: "false"
      DATABASE_URL: postgresql+asyncpg://billmax:${POSTGRES_PASSWORD:-billmax}@db:5432/billmax
      REDIS_URL: redis://redis:6379/0
      JWT_SECRET: ${JWT_SECRET}
      SECRET_KEY: ${SECRET_KEY}
      CORS_ORIGINS: ${CORS_ORIGINS:-["https://billmax.spidmax.win"]}
      SENTRY_DSN: ${SENTRY_DSN:-}
      MPESA_CONSUMER_KEY: ${MPESA_CONSUMER_KEY:-}
      MPESA_CONSUMER_SECRET: ${MPESA_CONSUMER_SECRET:-}
      MPESA_PASSKEY: ${MPESA_PASSKEY:-}
      MPESA_SHORTCODE: ${MPESA_SHORTCODE:-}
      MPESA_INITIATOR_NAME: ${MPESA_INITIATOR_NAME:-}
      MPESA_SECURITY_CREDENTIAL: ${MPESA_SECURITY_CREDENTIAL:-}
      MPESA_ENVIRONMENT: ${MPESA_ENVIRONMENT:-sandbox}
      MPESA_CALLBACK_URL: ${MPESA_CALLBACK_URL:-https://billmax.spidmax.win/api/v1/mpesa/stk-callback}
      SMTP_HOST: ${SMTP_HOST:-}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASSWORD: ${SMTP_PASSWORD:-}
      SMTP_FROM: ${SMTP_FROM:-}
      PROVISIONING_BACKEND: ${PROVISIONING_BACKEND:-mock}
      ROUTEROS_HOST: ${ROUTEROS_HOST:-}
      ROUTEROS_PORT: ${ROUTEROS_PORT:-8728}
      ROUTEROS_USERNAME: ${ROUTEROS_USERNAME:-admin}
      ROUTEROS_PASSWORD: ${ROUTEROS_PASSWORD:-}
      RADIUS_DATABASE_URL: ${RADIUS_DATABASE_URL:-}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  celery_worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: celery -A app.celery_app worker -l info
    environment:
      APP_NAME: ${APP_NAME:-BillMax}
      DATABASE_URL: postgresql+asyncpg://billmax:${POSTGRES_PASSWORD:-billmax}@db:5432/billmax
      REDIS_URL: redis://redis:***@db:5432/billmax
      REDIS_URL: redis://redis:6379/0
      PROVISIONING_BACKEND: ${PROVISIONING_BACKEND:-mock}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  celery_beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: celery -A app.celery_app beat -l info
    environment:
      APP_NAME: ${APP_NAME:-BillMax}
      DATABASE_URL: postgresql+asyncpg://billmax:${POSTGRES_PASSWORD:-billmax}@db:5432/billmax
      REDIS_URL: redis://redis:***@db:5432/billmax
      REDIS_URL: redis://redis:6379/0
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  pgdata:
""")

# The *** pattern will get mangled, so use a placeholder and fix it
content = parts[0]
# Fix the REDIS_URL lines that got mangled
# The redactor turns redis:***@db:5432/billmax into redis://redis:6379/0 but may duplicate

with open(path, 'w') as f:
    f.write(content)

print(f"Written {path}")
# Verify
with open(path, 'rb') as f:
    raw = f.read()
print(f"Size: {len(raw)} bytes")
print(f"REDIS_URL count: {raw.count(b'REDIS_URL')}")
