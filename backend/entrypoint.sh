#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Checking if seed data is needed..."
python -c "
from app.database import async_session
from app.models.organization import Organization
from sqlalchemy import select
import asyncio

async def check():
    async with async_session() as db:
        result = await db.execute(select(Organization).limit(1))
        org = result.scalar_one_or_none()
        if org is None:
            print('SEED_NEEDED')
        else:
            print('SEED_SKIP')

asyncio.run(check())
" > /tmp/seed_check

if grep -q "SEED_NEEDED" /tmp/seed_check; then
    echo "First deploy detected — seeding demo data..."
    python -m app.seed
else
    echo "Database already seeded — skipping."
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
