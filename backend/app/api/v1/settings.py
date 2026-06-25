from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import AdminOnly
from app.models.settings import OrgSettings
from app.models.user import User

router = APIRouter(prefix="/settings", tags=["settings"])

DEFAULT_SETTINGS: dict[str, Any] = {
    # General
    "app_name": "BillMax",
    "currency": "KES",
    "timezone": "Africa/Nairobi",
    # Billing
    "vat_rate": 16.0,
    "invoice_due_days": 7,
    "suspension_overdue_days": 30,
    "auto_send_invoice_email": False,
    # M-Pesa
    "mpesa_environment": "sandbox",
    "mpesa_consumer_key": "",
    "mpesa_consumer_secret": "",
    "mpesa_passkey": "",
    "mpesa_shortcode": "",
    "mpesa_initiator_name": "",
    "mpesa_security_credential": "",
    "mpesa_callback_url": "",
    # SMTP / Email
    "smtp_host": "localhost",
    "smtp_port": 587,
    "smtp_user": "",
    "smtp_password": "",
    "smtp_from": "noreply@billmax.ke",
    # Provisioning
    "provisioning_backend": "mock",
    "routeros_host": "",
    "routeros_port": 8728,
    "routeros_username": "admin",
    "routeros_password": "",
    "radius_database_url": "",
    # WhatsApp
    "whatsapp_enabled": False,
    "whatsapp_api_url": "",
    "whatsapp_api_key": "",
}


class SettingsUpdate(BaseModel):
    config: dict[str, Any]


@router.get("")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    # Eagerly load organization relationship
    await db.refresh(user, ["organization"])
    result = await db.execute(
        select(OrgSettings).where(OrgSettings.organization_id == user.organization_id)
    )
    settings_row = result.scalar_one_or_none()

    if not settings_row:
        # Return defaults if no settings configured yet
        return {
            "config": {**DEFAULT_SETTINGS},
            "organization": {
                "name": user.organization.name if user.organization else "BillMax",
                "address": user.organization.address if user.organization else "",
                "phone": user.organization.phone if user.organization else "",
                "email": user.organization.email if user.organization else "",
                "kra_pin": user.organization.kra_pin if user.organization else "",
                "logo_url": user.organization.logo_url if user.organization else "",
            },
        }

    return {
        "config": {**DEFAULT_SETTINGS, **settings_row.config},
        "organization": {
            "name": user.organization.name if user.organization else "BillMax",
            "address": user.organization.address if user.organization else "",
            "phone": user.organization.phone if user.organization else "",
            "email": user.organization.email if user.organization else "",
            "kra_pin": user.organization.kra_pin if user.organization else "",
            "logo_url": user.organization.logo_url if user.organization else "",
        },
    }


@router.put("")
async def update_settings(
    data: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    await db.refresh(user, ["organization"])
    result = await db.execute(
        select(OrgSettings).where(OrgSettings.organization_id == user.organization_id)
    )
    settings_row = result.scalar_one_or_none()

    if settings_row:
        settings_row.config = {**DEFAULT_SETTINGS, **settings_row.config, **data.config}
    else:
        settings_row = OrgSettings(
            organization_id=user.organization_id,
            config={**DEFAULT_SETTINGS, **data.config},
        )
        db.add(settings_row)

    await db.commit()
    await db.refresh(settings_row)

    # Reload settings into the running application so changes take effect immediately
    from app.config import settings
    settings.load_from_db(settings_row.config)

    return {
        "message": "Settings saved successfully",
        "config": settings_row.config,
    }


@router.put("/organization")
async def update_organization_settings(
    data: dict[str, str],
    db: AsyncSession = Depends(get_db),
    user: User = Depends(AdminOnly),
):
    """Update organization basic info (name, address, phone, email, kra_pin, logo_url)."""
    await db.refresh(user, ["organization"])
    org = user.organization
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    allowed_fields = {"name", "address", "phone", "email", "kra_pin", "logo_url"}
    for field, value in data.items():
        if field in allowed_fields and hasattr(org, field):
            setattr(org, field, value)

    await db.commit()
    await db.refresh(org)

    return {
        "message": "Organization updated",
        "organization": {
            "name": org.name,
            "address": org.address,
            "phone": org.phone,
            "email": org.email,
            "kra_pin": org.kra_pin,
            "logo_url": org.logo_url,
        },
    }
