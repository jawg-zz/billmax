from __future__ import annotations
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.customer import Customer
from app.models.plan import Plan
from app.models.provisioning_log import ProvisioningLog
from app.models.subscription import Subscription
from app.provisioning import get_provisioning_backend
from app.provisioning.registry import get_all_backends


async def provision_subscription(
    db: AsyncSession,
    subscription_id: uuid.UUID,
    organization_id: uuid.UUID,
) -> dict:
    sub_result = await db.execute(
        select(Subscription).where(
            Subscription.id == subscription_id,
            Subscription.organization_id == organization_id,
        )
    )
    sub = sub_result.scalar_one_or_none()
    if not sub:
        return {"success": False, "error": "Subscription not found"}

    plan_result = await db.execute(select(Plan).where(Plan.id == sub.plan_id))
    plan = plan_result.scalar_one_or_none()
    if not plan:
        return {"success": False, "error": "Plan not found"}

    cust_result = await db.execute(
        select(Customer).where(Customer.id == sub.customer_id)
    )
    customer = cust_result.scalar_one_or_none()
    if not customer:
        return {"success": False, "error": "Customer not found"}

    username = sub.provisioned_username or f"ISP-{customer.id.hex[:8].upper()}"
    password = f"PWD-{customer.id.hex[-8:].upper()}"

    sub.provisioned_username = username
    sub.provisioned = True

    results = []
    for backend in get_all_backends():
        result = await backend.provision(
            username=username,
            password=password,
            download_speed=plan.download_speed_mbps,
            upload_speed=plan.upload_speed_mbps,
        )
        log = ProvisioningLog(
            organization_id=organization_id,
            subscription_id=subscription_id,
            action="provision",
            backend=backend.name,
            status="success" if result.get("success") else "failed",
            request_data={
                "username": username,
                "download_speed": plan.download_speed_mbps,
                "upload_speed": plan.upload_speed_mbps,
            },
            response_data=result,
            error_message=result.get("error"),
        )
        db.add(log)
        results.append({"backend": backend.name, "result": result})

    await db.commit()
    return {
        "success": all(r["result"].get("success", False) for r in results),
        "username": username,
        "password": password,
        "details": results,
    }


async def suspend_subscription(
    db: AsyncSession,
    subscription_id: uuid.UUID,
    organization_id: uuid.UUID,
) -> dict:
    sub_result = await db.execute(
        select(Subscription).where(
            Subscription.id == subscription_id,
            Subscription.organization_id == organization_id,
        )
    )
    sub = sub_result.scalar_one_or_none()
    if not sub:
        return {"success": False, "error": "Subscription not found"}

    username = sub.provisioned_username
    if not username:
        return {"success": False, "error": "Not provisioned"}

    sub.status = "suspended"
    results = []
    for backend in get_all_backends():
        result = await backend.suspend(username=username)
        log = ProvisioningLog(
            organization_id=organization_id,
            subscription_id=subscription_id,
            action="suspend",
            backend=backend.name,
            status="success" if result.get("success") else "failed",
            request_data={"username": username},
            response_data=result,
            error_message=result.get("error"),
        )
        db.add(log)
        results.append({"backend": backend.name, "result": result})

    await db.commit()
    return {
        "success": all(r["result"].get("success", False) for r in results),
        "username": username,
        "details": results,
    }


async def restore_subscription(
    db: AsyncSession,
    subscription_id: uuid.UUID,
    organization_id: uuid.UUID,
) -> dict:
    sub_result = await db.execute(
        select(Subscription).where(
            Subscription.id == subscription_id,
            Subscription.organization_id == organization_id,
        )
    )
    sub = sub_result.scalar_one_or_none()
    if not sub:
        return {"success": False, "error": "Subscription not found"}

    username = sub.provisioned_username
    if not username:
        return {"success": False, "error": "Not provisioned"}

    sub.status = "active"
    results = []
    for backend in get_all_backends():
        result = await backend.restore(username=username)
        log = ProvisioningLog(
            organization_id=organization_id,
            subscription_id=subscription_id,
            action="restore",
            backend=backend.name,
            status="success" if result.get("success") else "failed",
            request_data={"username": username},
            response_data=result,
            error_message=result.get("error"),
        )
        db.add(log)
        results.append({"backend": backend.name, "result": result})

    await db.commit()
    return {
        "success": all(r["result"].get("success", False) for r in results),
        "username": username,
        "details": results,
    }


async def change_subscription_speed(
    db: AsyncSession,
    subscription_id: uuid.UUID,
    organization_id: uuid.UUID,
    plan_id: uuid.UUID,
) -> dict:
    sub_result = await db.execute(
        select(Subscription).where(
            Subscription.id == subscription_id,
            Subscription.organization_id == organization_id,
        )
    )
    sub = sub_result.scalar_one_or_none()
    if not sub:
        return {"success": False, "error": "Subscription not found"}

    new_plan_result = await db.execute(
        select(Plan).where(Plan.id == plan_id)
    )
    new_plan = new_plan_result.scalar_one_or_none()
    if not new_plan:
        return {"success": False, "error": "Plan not found"}

    username = sub.provisioned_username
    if not username:
        return {"success": False, "error": "Not provisioned"}

    sub.plan_id = plan_id
    results = []
    for backend in get_all_backends():
        result = await backend.change_speed(
            username=username,
            download_speed=new_plan.download_speed_mbps,
            upload_speed=new_plan.upload_speed_mbps,
        )
        log = ProvisioningLog(
            organization_id=organization_id,
            subscription_id=subscription_id,
            action="speed_change",
            backend=backend.name,
            status="success" if result.get("success") else "failed",
            request_data={
                "username": username,
                "new_speed": f"{new_plan.download_speed_mbps}/{new_plan.upload_speed_mbps}",
            },
            response_data=result,
            error_message=result.get("error"),
        )
        db.add(log)
        results.append({"backend": backend.name, "result": result})

    await db.commit()
    return {
        "success": all(r["result"].get("success", False) for r in results),
        "username": username,
        "new_speed": f"{new_plan.download_speed_mbps}/{new_plan.upload_speed_mbps}",
        "details": results,
    }


async def deprovision_subscription(
    db: AsyncSession,
    subscription_id: uuid.UUID,
    organization_id: uuid.UUID,
) -> dict:
    sub_result = await db.execute(
        select(Subscription).where(
            Subscription.id == subscription_id,
            Subscription.organization_id == organization_id,
        )
    )
    sub = sub_result.scalar_one_or_none()
    if not sub:
        return {"success": False, "error": "Subscription not found"}

    username = sub.provisioned_username
    if not username:
        return {"success": False, "error": "Not provisioned"}

    sub.status = "cancelled"
    sub.provisioned = False
    sub.provisioned_username = None

    results = []
    for backend in get_all_backends():
        result = await backend.deprovision(username=username)
        log = ProvisioningLog(
            organization_id=organization_id,
            subscription_id=subscription_id,
            action="deprovision",
            backend=backend.name,
            status="success" if result.get("success") else "failed",
            request_data={"username": username},
            response_data=result,
            error_message=result.get("error"),
        )
        db.add(log)
        results.append({"backend": backend.name, "result": result})

    await db.commit()
    return {
        "success": all(r["result"].get("success", False) for r in results),
        "username": username,
        "details": results,
    }


async def get_provisioning_logs(
    db: AsyncSession,
    organization_id: uuid.UUID,
    subscription_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[ProvisioningLog]:
    query = select(ProvisioningLog).where(
        ProvisioningLog.organization_id == organization_id
    )
    if subscription_id:
        query = query.where(ProvisioningLog.subscription_id == subscription_id)
    query = query.order_by(ProvisioningLog.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())

