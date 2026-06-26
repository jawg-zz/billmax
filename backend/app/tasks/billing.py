from datetime import date

from app.celery_app import celery_app
from app.database import async_session
from app.services.billing_engine import run_billing
from app.services.dunning import process_overdue as run_overdue_processing
from app.models.organization import Organization
from app.logging_config import get_logger
from sqlalchemy import select

logger = get_logger("tasks.billing")


@celery_app.task(bind=True)
def daily_billing_run(self):
    import asyncio
    logger.info("Starting daily billing run")
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
            logger.info("Billing run for %s: %s invoices created", org_id, len(invoices))


@celery_app.task(bind=True)
def process_overdue(self):
    import asyncio
    logger.info("Starting overdue processing")
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
            actions = await run_overdue_processing(db, organization_id=org_id)
            logger.info("Overdue processing for %s: %s actions", org_id, len(actions))
