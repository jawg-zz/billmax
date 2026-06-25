from datetime import date

from app.celery_app import celery_app
from app.database import async_session
from app.services.billing_engine import run_billing
from app.services.dunning import process_overdue as run_overdue_processing
from app.models.organization import Organization
from sqlalchemy import select


@celery_app.task
def daily_billing_run():
    import asyncio
    try:
        asyncio.get_running_loop()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(_run_billing_for_all_orgs())
        finally:
            loop.close()
    except RuntimeError:
        asyncio.run(_run_billing_for_all_orgs())


async def _run_billing_for_all_orgs():
    async with async_session() as db:
        result = await db.execute(select(Organization.id))
        org_ids = result.scalars().all()
    for org_id in org_ids:
        async with async_session() as db:
            invoices = await run_billing(db, org_id)
            print(f"Billing run for {org_id}: {len(invoices)} invoices created")


@celery_app.task
def process_overdue():
    import asyncio
    try:
        asyncio.get_running_loop()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(_process_overdue_for_all())
        finally:
            loop.close()
    except RuntimeError:
        asyncio.run(_process_overdue_for_all())


async def _process_overdue_for_all():
    async with async_session() as db:
        result = await db.execute(select(Organization.id))
        org_ids = result.scalars().all()
    for org_id in org_ids:
        async with async_session() as db:
            actions = await run_overdue_processing(db)
        print(f"Overdue processing: {len(actions)} actions taken")
