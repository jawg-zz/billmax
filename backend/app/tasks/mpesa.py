from app.celery_app import celery_app
from app.database import async_session
from app.services.mpesa_service import reconcile_pending


@celery_app.task
def reconcile_mpesa_transactions():
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
        print(f"M-Pesa reconciliation: {len(results)} transactions processed")
