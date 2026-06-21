#!/bin/sh
set -e

export PYTHONPATH=/app

echo "Stamping existing migrations as applied..."
alembic stamp head

echo "Running pending migrations (column type changes, new tables)..."
alembic upgrade head

echo "Initializing database (creates tables not yet migrated, seeds data)..."
python -m app.init_db

echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
