import uuid
from datetime import datetime, timezone

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.notification import Notification


async def send_whatsapp(
    db: AsyncSession,
    organization_id: uuid.UUID,
    customer_id: uuid.UUID | None,
    recipient: str,
    message: str,
) -> bool:
    if not settings.WHATSAPP_ENABLED or not settings.WHATSAPP_API_URL:
        notification = Notification(
            organization_id=organization_id,
            customer_id=customer_id,
            recipient=recipient,
            subject="WhatsApp Message",
            body=message,
            channel="whatsapp",
            status="pending",
            error_message="WhatsApp integration not configured",
        )
        db.add(notification)
        return False

    sent = False
    error_message = None
    try:
        async with AsyncClient() as client:
            resp = await client.post(
                settings.WHATSAPP_API_URL,
                json={
                    "to": recipient,
                    "text": message,
                },
                headers={
                    "Authorization": f"Bearer {settings.WHATSAPP_API_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=15,
            )
            resp.raise_for_status()
            sent = True
    except Exception as e:
        error_message = str(e)[:500]
        sent = False

    notification = Notification(
        organization_id=organization_id,
        customer_id=customer_id,
        recipient=recipient,
        subject="WhatsApp Message",
        body=message,
        channel="whatsapp",
        status="sent" if sent else "failed",
        sent_at=datetime.now(timezone.utc) if sent else None,
        error_message=error_message,
    )
    db.add(notification)
    return sent
