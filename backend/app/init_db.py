import asyncio
import sys

from sqlalchemy import select, text

from app.database import async_session, engine, Base
from app.models import *  # noqa: F401,F403
from app.models.organization import Organization


async def wait_for_db(retries: int = 30, delay: int = 2):
    for attempt in range(1, retries + 1):
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            print(f"Database ready (attempt {attempt})")
            return
        except Exception as e:
            if attempt < retries:
                print(f"Waiting for database... ({attempt}/{retries})")
                await asyncio.sleep(delay)
            else:
                print(f"Database connection failed: {e}")
                sys.exit(1)


async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created/verified")


async def needs_seed() -> bool:
    async with async_session() as db:
        result = await db.execute(select(Organization).limit(1))
        return result.scalar_one_or_none() is None


async def run_migrations():
    async with engine.begin() as conn:
        result = await conn.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_name='customers' AND column_name='portal_password'")
        )
        if result.rowcount == 0:
            await conn.execute(text("ALTER TABLE customers ADD COLUMN portal_password VARCHAR(255)"))
            print("Added portal_password column to customers")


async def main():
    await wait_for_db()
    await create_tables()
    await run_migrations()

    if await needs_seed():
        print("First deploy — seeding demo data...")
        from app.seed import seed
        await seed()
    else:
        print("Database already seeded — skipping.")


if __name__ == "__main__":
    asyncio.run(main())
