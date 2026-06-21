#!/bin/sh
set -e

export PYTHONPATH=/app

echo "Stamping existing migrations as applied..."
alembic stamp head

echo "Initializing database (creates tables, seeds data)..."
python -m app.init_db

echo "Running pending migrations..."
alembic upgrade head

echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
