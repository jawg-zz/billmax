#!/usr/bin/env python3
"""Add celery_worker and celery_beat services to docker-compose.yml."""
import os

path = "/opt/data/workspace/billmax/docker-compose.yml"

with open(path, 'r') as f:
    content = f.read()

celery = """
  celery_worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: celery -A app.celery_app worker -l info
    environment:
      APP_NAME: ${APP_NAME:-BillMax}
      DATABASE_URL: postgresql+asyncpg://billmax:${POSTGRES_PASSWORD:-billmax}@db:5432/billmax
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
      REDIS_URL: redis://redis:6379/0
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
"""

# Insert before "  frontend:"
content = content.replace("\n  frontend:", celery + "\n  frontend:", 1)

with open(path, 'w') as f:
    f.write(content)

with open(path, 'rb') as f:
    data = f.read()
print(f"Written {len(data)} bytes, {data.count(chr(10))} lines")
print(f"REDIS_URLs: {data.count(b'REDIS_URL')}")
for key in [b'celery_worker', b'celery_beat', b'JWT_SECRET', b'CORS_ORIGINS', b'SMTP_FROM']:
    count = data.count(key)
    print(f"  {key.decode():20} {'OK' if count == 1 else f'WARN ({count}x)'}")
