import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


async def log_audit(
    db: AsyncSession,
    organization_id: uuid.UUID,
    action: str,
    resource_type: str,
    resource_id: str,
    user_id: uuid.UUID | None = None,
    old_values: dict | None = None,
    new_values: dict | None = None,
) -> AuditLog:
    """Create an audit log entry and add it to the session (does NOT commit)."""
    entry = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        old_values=old_values,
        new_values=new_values,
    )
    db.add(entry)
    return entry
