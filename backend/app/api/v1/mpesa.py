import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import AdminOnly, BillingStaff, get_daraja_client
from app.models.mpesa import MpesaTransaction
from app.models.user import User
from app.services.mpesa_service import (
    handle_c2b_confirmation,
    handle_c2b_validation,
    handle_stk_callback,
    initiate_stk_push,
    list_transactions,
    query_transaction_status,
)

router = APIRouter(prefix="/mpesa", tags=["mpesa"])


@router.post("/stk-push")
async def stk_push(
    customer_id: uuid.UUID = Query(...),
    amount: float = Query(..., gt=0),
    phone: str = Query(...),
    invoice_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(BillingStaff),
    client = Depends(get_daraja_client),
):
    result = await initiate_stk_push(
        db,
        organization_id=user.organization_id,
        invoice_id=invoice_id,
        customer_id=customer_id,
        phone=phone,
        amount=amount,
        client=client,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.post("/stk-callback")
async def stk_callback(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.json()
    result = await handle_stk_callback(db, body)
    return {"ResultCode": 0, "ResultDesc": "Success"}


@router.post("/c2b/validation")
async def c2b_validation(request: Request):
    body = await request.json()
    return await handle_c2b_validation(body)


@router.post("/c2b/confirmation")
async def c2b_confirmation(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.json()
    result = await handle_c2b_confirmation(db, body)
    return {"ResultCode": 0, "ResultDesc": "Success"}


@router.post("/query")
async def mpesa_query(
    checkout_request_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(BillingStaff),
    client = Depends(get_daraja_client),
):
    result = await query_transaction_status(db, checkout_request_id, client=client)
    return result


@router.get("/transactions")
async def mpesa_transactions(
    status: str | None = Query(None),
    customer_id: uuid.UUID | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(BillingStaff),
):
    txs = await list_transactions(
        db,
        user.organization_id,
        status=status,
        customer_id=customer_id,
        date_from=date_from,
        date_to=date_to,
        search=search,
        skip=skip,
        limit=limit,
    )
    return [
        {
            "id": str(tx.id),
            "type": tx.type,
            "phone": tx.phone_number,
            "amount": float(tx.amount),
            "receipt": tx.receipt_number,
            "status": tx.status,
            "checkout_request_id": tx.checkout_request_id,
            "customer_id": str(tx.customer_id) if tx.customer_id else None,
            "invoice_id": str(tx.invoice_id) if tx.invoice_id else None,
            "account_reference": tx.account_reference,
            "created_at": tx.created_at.isoformat(),
            "updated_at": tx.updated_at.isoformat(),
        }
        for tx in txs
    ]


@router.post("/reconcile")
async def reconcile_pending_transactions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(BillingStaff),
    client = Depends(get_daraja_client),
):
    """Manually trigger reconciliation of pending transactions."""
    from app.services.mpesa_service import reconcile_pending
    results = await reconcile_pending(db, client=client)
    return {
        "processed": len(results),
        "transactions": [
            {
                "id": str(tx["id"]),
                "status": tx["status"],
            }
            for tx in results
        ],
    }


@router.get("/summary")
async def mpesa_summary(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(BillingStaff),
):
    """Get M-Pesa transaction summary for dashboard."""
    from sqlalchemy import func, and_
    from datetime import datetime, timedelta

    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)

    # Today's stats
    today_result = await db.execute(
        select(
            func.count(MpesaTransaction.id),
            func.sum(MpesaTransaction.amount),
        ).where(
            and_(
                MpesaTransaction.organization_id == user.organization_id,
                MpesaTransaction.status == "completed",
                func.date(MpesaTransaction.created_at) == today,
            )
        )
    )
    today_count, today_total = today_result.one()

    # Week's stats
    week_result = await db.execute(
        select(
            func.count(MpesaTransaction.id),
            func.sum(MpesaTransaction.amount),
        ).where(
            and_(
                MpesaTransaction.organization_id == user.organization_id,
                MpesaTransaction.status == "completed",
                func.date(MpesaTransaction.created_at) >= week_ago,
            )
        )
    )
    week_count, week_total = week_result.one()

    # Pending count
    pending_result = await db.execute(
        select(func.count(MpesaTransaction.id)).where(
            and_(
                MpesaTransaction.organization_id == user.organization_id,
                MpesaTransaction.status == "pending",
            )
        )
    )
    pending_count = pending_result.scalar()

    return {
        "today": {
            "count": today_count or 0,
            "total": float(today_total or 0),
        },
        "week": {
            "count": week_count or 0,
            "total": float(week_total or 0),
        },
        "pending": pending_count or 0,
    }
