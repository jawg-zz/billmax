from app.celery_app import celery_app
from app.database import async_session
from app.models.organization import Organization
from app.services.usage_service import check_fup_enforcement
from sqlalchemy import select


@celery_app.task
def enforce_usage_policies():
    import asyncio
    try:
        asyncio.get_running_loop()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(_enforce_fup_for_all_orgs())
        finally:
            loop.close()
    except RuntimeError:
        asyncio.run(_enforce_fup_for_all_orgs())


async def _enforce_fup_for_all_orgs():
    async with async_session() as db:
        result = await db.execute(select(Organization.id))
        org_ids = result.scalars().all()
    total_alerts = 0
    for org_id in org_ids:
        async with async_session() as db_session:
            alerts = await check_fup_enforcement(db_session, org_id)
            total_alerts += len(alerts)
    print(f"FUP enforcement: {total_alerts} alerts created across {len(org_ids)} orgs")
