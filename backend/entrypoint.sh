#!/bin/sh
set -e

export PYTHONPATH=/app

echo "Stamping migrations up to 0003 as applied (tables created by init_db)..."
alembic stamp 0003

echo "Running pending migrations (0004: usage_records BIGINT)..."
alembic upgrade head

echo "Initializing database (creates remaining tables, seeds data)..."
python -m app.init_db

echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
