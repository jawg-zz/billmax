from datetime import date

from app.celery_app import celery_app
from app.database import async_session
from app.services.billing_engine import run_billing
from app.services.dunning import process_overdue
from app.models.organization import Organization
from sqlalchemy import select


@celery_app.task
def daily_billing_run():
    import asyncio
    asyncio.run(_run_billing_for_all_orgs())


async def _run_billing_for_all_orgs():
    async with async_session() as db:
        result = await db.execute(select(Organization.id))
        org_ids = result.scalars().all()
        for org_id in org_ids:
            invoices = await run_billing(db, org_id)
            print(f"Billing run for {org_id}: {len(invoices)} invoices created")


@celery_app.task
def process_overdue_task():
    import asyncio
    asyncio.run(_process_overdue_for_all())


async def _process_overdue_for_all():
    async with async_session() as db:
        actions = await process_overdue(db)
        print(f"Overdue processing: {len(actions)} actions taken")
