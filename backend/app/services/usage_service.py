import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.usage import UsageAlert, UsageRecord
from app.schemas.usage import UsageSummary


async def record_usage(
    db: AsyncSession,
    organization_id: uuid.UUID,
    subscription_id: uuid.UUID,
    download_bytes: int,
    upload_bytes: int,
    period_start: datetime,
    period_end: datetime,
    source: str = "api",
) -> UsageRecord:
    record = UsageRecord(
        organization_id=organization_id,
        subscription_id=subscription_id,
        download_bytes=download_bytes,
        upload_bytes=upload_bytes,
        total_bytes=download_bytes + upload_bytes,
        period_start=period_start,
        period_end=period_end,
        source=source,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def get_usage_summary(
    db: AsyncSession,
    organization_id: uuid.UUID,
    subscription_id: uuid.UUID | None = None,
    customer_id: uuid.UUID | None = None,
    days: int = 30,
) -> list[UsageSummary]:
    since = datetime.now(timezone.utc) - timedelta(days=days)

    query = (
        select(
            UsageRecord.subscription_id,
            UsageRecord.organization_id,
            func.sum(UsageRecord.download_bytes).label("download_bytes"),
            func.sum(UsageRecord.upload_bytes).label("upload_bytes"),
            func.sum(UsageRecord.total_bytes).label("total_bytes"),
            func.min(UsageRecord.period_start).label("period_start"),
            func.max(UsageRecord.period_end).label("period_end"),
        )
        .where(
            UsageRecord.organization_id == organization_id,
            UsageRecord.created_at >= since,
        )
        .group_by(UsageRecord.subscription_id, UsageRecord.organization_id)
    )

    if subscription_id:
        query = query.where(UsageRecord.subscription_id == subscription_id)

    result = await db.execute(query)
    rows = result.all()

    summaries = []
    for row in rows:
        sub_result = await db.execute(
            select(Subscription).where(Subscription.id == row.subscription_id)
        )
        sub = sub_result.scalar_one_or_none()
        if not sub:
            continue

        if customer_id and sub.customer_id != customer_id:
            continue

        cust_result = await db.execute(
            select(Customer).where(Customer.id == sub.customer_id)
        )
        customer = cust_result.scalar_one_or_none()

        plan_result = await db.execute(select(Plan).where(Plan.id == sub.plan_id))
        plan = plan_result.scalar_one_or_none()

        total_gb = float(row.total_bytes / (1024**3)) if row.total_bytes else 0
        data_cap_gb = float(plan.data_cap_gb) if plan and plan.data_cap_gb else None
        usage_percent = (total_gb / data_cap_gb * 100) if data_cap_gb and data_cap_gb > 0 else 0

        summaries.append(
            UsageSummary(
                subscription_id=row.subscription_id,
                customer_name=f"{customer.first_name} {customer.last_name}" if customer else "Unknown",
                plan_name=plan.name if plan else "Unknown",
                data_cap_gb=data_cap_gb,
                download_gb=row.download_bytes / (1024**3) if row.download_bytes else 0,
                upload_gb=row.upload_bytes / (1024**3) if row.upload_bytes else 0,
                total_gb=round(total_gb, 2),
                usage_percent=round(usage_percent, 1),
                period_start=row.period_start,
                period_end=row.period_end,
            )
        )

    return summaries


async def get_subscription_current_usage(
    db: AsyncSession,
    subscription_id: uuid.UUID,
    days: int = 30,
) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            func.sum(UsageRecord.download_bytes).label("download_bytes"),
            func.sum(UsageRecord.upload_bytes).label("upload_bytes"),
            func.sum(UsageRecord.total_bytes).label("total_bytes"),
        ).where(
            UsageRecord.subscription_id == subscription_id,
            UsageRecord.created_at >= since,
        )
    )
    row = result.one()
    download_gb = (row.download_bytes or 0) / (1024**3)
    upload_gb = (row.upload_bytes or 0) / (1024**3)
    total_gb = (row.total_bytes or 0) / (1024**3)

    sub_result = await db.execute(
        select(Subscription).where(Subscription.id == subscription_id)
    )
    sub = sub_result.scalar_one_or_none()
    data_cap_gb = None
    if sub:
        plan_result = await db.execute(select(Plan).where(Plan.id == sub.plan_id))
        plan = plan_result.scalar_one_or_none()
        if plan and plan.data_cap_gb:
            data_cap_gb = float(plan.data_cap_gb)

    usage_percent = round(total_gb / data_cap_gb * 100, 1) if data_cap_gb and data_cap_gb > 0 else 0

    return {
        "subscription_id": str(subscription_id),
        "download_gb": round(download_gb, 2),
        "upload_gb": round(upload_gb, 2),
        "total_gb": round(total_gb, 2),
        "data_cap_gb": data_cap_gb,
        "usage_percent": usage_percent,
    }


async def check_fup_enforcement(
    db: AsyncSession,
    organization_id: uuid.UUID,
) -> list[dict]:
    alerts = []
    since = datetime.now(timezone.utc) - timedelta(days=30)

    result = await db.execute(
        select(Subscription).where(
            Subscription.organization_id == organization_id,
            Subscription.status == "active",
        )
    )
    subscriptions = result.scalars().all()

    for sub in subscriptions:
        plan_result = await db.execute(select(Plan).where(Plan.id == sub.plan_id))
        plan = plan_result.scalar_one_or_none()
        if not plan or not plan.data_cap_gb:
            continue

        usage_result = await db.execute(
            select(func.sum(UsageRecord.total_bytes).label("total_bytes"))
            .where(
                UsageRecord.subscription_id == sub.id,
                UsageRecord.created_at >= since,
            )
        )
        row = usage_result.one()
        total_bytes = row.total_bytes or 0
        total_gb = total_bytes / (1024**3)
        data_cap_gb = float(plan.data_cap_gb)
        usage_percent = (total_gb / data_cap_gb) * 100 if data_cap_gb > 0 else 0

        thresholds = [
            (80, "warning", None, f"Usage at {usage_percent:.0f}% of {data_cap_gb} GB cap"),
            (95, "critical", None, f"Usage at {usage_percent:.0f}% of {data_cap_gb} GB cap — FUP imminent"),
            (100, "fup_active", "speed_limited", f"FUP applied: speed reduced to {plan.fup_speed_mbps or 1} Mbps"),
        ]

        for threshold, alert_type, action, message in thresholds:
            if usage_percent >= threshold:
                existing = await db.execute(
                    select(UsageAlert).where(
                        UsageAlert.subscription_id == sub.id,
                        UsageAlert.alert_type == alert_type,
                        UsageAlert.created_at >= since,
                    )
                )
                if not existing.scalar_one_or_none():
                    alert = UsageAlert(
                        organization_id=organization_id,
                        subscription_id=sub.id,
                        alert_type=alert_type,
                        message=message,
                        threshold_percent=threshold,
                        current_usage_gb=round(total_gb, 2),
                        data_cap_gb=data_cap_gb,
                        action_taken=action,
                    )
                    db.add(alert)
                    alerts.append({
                        "subscription_id": str(sub.id),
                        "alert_type": alert_type,
                        "message": message,
                        "action_taken": action,
                    })

                    if action == "speed_limited" and plan.fup_speed_mbps:
                        from app.provisioning import get_provisioning_backend
                        backend = get_provisioning_backend()
                        if backend and sub.provisioned_username:
                            await backend.change_speed(
                                username=sub.provisioned_username,
                                download_speed=plan.fup_speed_mbps,
                                upload_speed=max(1, plan.fup_speed_mbps // 2),
                            )

    await db.commit()

    return alerts
