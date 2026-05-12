from app.celery_app import celery_app
from app.database import async_session
from app.services.mpesa_service import reconcile_pending


@celery_app.task
def reconcile_mpesa_transactions():
    import asyncio
    asyncio.run(_reconcile())


async def _reconcile():
    async with async_session() as db:
        results = await reconcile_pending(db)
        print(f"M-Pesa reconciliation: {len(results)} transactions processed")
