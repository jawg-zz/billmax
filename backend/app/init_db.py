import asyncio
import os
import sys

from sqlalchemy import select, text

from app.database import async_session, engine, Base
from app.models import *  # noqa: F401,F403
from app.models.organization import Organization
from app.logging_config import get_logger

logger = get_logger("init_db")


async def wait_for_db(retries: int = 30, delay: int = 2):
    for attempt in range(1, retries + 1):
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("Database ready (attempt %s)", attempt)
            return
        except Exception as e:
            if attempt < retries:
                logger.warning("Waiting for database... (%s/%s)", attempt, retries)
                await asyncio.sleep(delay)
            else:
                logger.critical("Database connection failed: %s", e)
                sys.exit(1)


async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created/verified")


async def needs_seed() -> bool:
    async with async_session() as db:
        result = await db.execute(select(Organization).limit(1))
        return result.scalar_one_or_none() is None


async def drop_all_data():
    """Drop all data from all tables (for reseeding)."""
    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(text(f"TRUNCATE TABLE {table.name} CASCADE"))
    print("All existing data cleared.")


async def column_exists(conn, table: str, column: str) -> bool:
    result = await conn.execute(
        text("SELECT column_name FROM information_schema.columns WHERE table_name=:t AND column_name=:c"),
        {"t": table, "c": column},
    )
    return result.scalar() is not None


async def run_migrations():
    async with engine.begin() as conn:
        if not await column_exists(conn, "customers", "portal_password"):
            await conn.execute(text("ALTER TABLE customers ADD COLUMN portal_password VARCHAR(255)"))
            print("  + Added portal_password column to customers")

        if not await column_exists(conn, "invoices", "kra_etims_code"):
            await conn.execute(text("ALTER TABLE invoices ADD COLUMN kra_etims_code VARCHAR(100)"))
            print("  + Added kra_etims_code column to invoices")


async def main():
    await wait_for_db()
    await create_tables()
    await run_migrations()

    reseed = os.environ.get("RESEED_DEMO", "").lower() in ("true", "1", "yes")

    if reseed:
        print("RESEED_DEMO=true — clearing existing data and reseeding...")
        await drop_all_data()
        from app.seed import seed
        await seed()
    elif await needs_seed():
        print("First deploy — seeding demo data...")
        from app.seed import seed
        await seed()
    else:
        print("Database already seeded — skipping. Set RESEED_DEMO=true to re-seed.")


if __name__ == "__main__":
    asyncio.run(main())
