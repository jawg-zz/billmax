#!/bin/sh
set -e

echo "Running Alembic migrations..."
alembic upgrade head

echo "Seeding database..."
python -m app.init_db

echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
