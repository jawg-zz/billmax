from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "billmax",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Nairobi",
    enable_utc=True,
)

celery_app.conf.beat_schedule = {
    "daily-billing-run": {
        "task": "app.tasks.billing.daily_billing_run",
        "schedule": crontab(hour=2, minute=0),
    },
    "process-overdue": {
        "task": "app.tasks.billing.process_overdue",
        "schedule": crontab(hour=6, minute=0),
    },
    "reconcile-mpesa": {
        "task": "app.tasks.mpesa.reconcile_mpesa_transactions",
        "schedule": crontab(hour="*/1", minute=30),
    },
    "enforce-fup": {
        "task": "app.tasks.usage.enforce_usage_policies",
        "schedule": crontab(hour="*/4", minute=0),
    },
}
