from app.celery_app import celery_app
from app.database import async_session
from app.services.mpesa_service import reconcile_pending
from app.logging_config import get_logger

logger = get_logger("tasks.mpesa")


@celery_app.task(bind=True)
def reconcile_mpesa_transactions(self):
    import asyncio
    try:
        asyncio.get_running_loop()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(_reconcile())
        finally:
            loop.close()
    except RuntimeError:
        asyncio.run(_reconcile())


async def _reconcile():
    from app.integrations.mpesa.daraja import DarajaClient
    client = DarajaClient.from_settings()
    async with async_session() as db:
        results = await reconcile_pending(db, client=client)
        logger.info("M-Pesa reconciliation: %s transactions processed", len(results))
