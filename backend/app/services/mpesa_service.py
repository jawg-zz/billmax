import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.integrations.mpesa.daraja import DarajaClient, DarajaError
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.mpesa import MpesaTransaction
from app.models.organization import Organization
from app.services.invoice_service import InvoiceService
from app.logging_config import get_logger

logger = get_logger("services.mpesa")

# M-Pesa STK Push limits from Safaricom documentation
MIN_STK_AMOUNT = 1.0
MAX_STK_AMOUNT = 150_000.0

# Auto-fail pending transactions older than this
PENDING_TIMEOUT_HOURS = 24


def _normalize_phone(phone: str) -> str:
    """Convert Kenyan phone numbers to international format (254...).

    Handles: 0713702904, +254****2904, 254713702904, 0713 702 904
    """
    cleaned = "".join(c for c in phone if c.isdigit())
    if cleaned.startswith("0"):
        cleaned = "254" + cleaned[1:]
    elif cleaned.startswith("+"):
        cleaned = cleaned[1:]
    elif not cleaned.startswith("254"):
        cleaned = "254" + cleaned
    return cleaned


def _map_daraja_status(result_code) -> str:
    """Map a Daraja API ResultCode to an internal transaction status.

    Returns one of: completed, cancelled, pending, failed
    """
    if result_code == "0" or result_code == 0:
        return "completed"
    elif result_code in ("1032", 1032):
        # User explicitly declined the STK prompt on their phone
        return "cancelled"
    elif result_code in ("1037", 1037):
        # DS timeout — user hasn't responded yet; keep as pending so polling continues
        return "pending"
    elif result_code is not None:
        # Any other non-zero code is a failure (insufficient balance, etc.)
        return "failed"
    return "pending"


def _extract_receipt(daraja_resp: dict) -> str | None:
    """Extract M-Pesa receipt number from a Daraja API response."""
    callback_items = daraja_resp.get("CallbackMetadata", {}).get("Item", [])
    for item in callback_items:
        if item.get("Name") == "MpesaReceiptNumber":
            return str(item.get("Value", ""))
    return None


async def initiate_stk_push(
    db: AsyncSession,
    organization_id: uuid.UUID,
    invoice_id: uuid.UUID | None,
    customer_id: uuid.UUID,
    phone: str,
    amount: float,
    client: "DarajaClient",
) -> dict:
    # --- Validation ---
    if amount <= 0:
        return {"success": False, "error": "Amount must be greater than 0"}

    if amount < MIN_STK_AMOUNT:
        return {
            "success": False,
            "error": f"Amount must be at least KES {MIN_STK_AMOUNT:,.0f}",
        }
    if amount > MAX_STK_AMOUNT:
        return {
            "success": False,
            "error": f"STK Push amount exceeds maximum of KES {MAX_STK_AMOUNT:,.0f}. Use a different payment method for larger amounts.",
        }

    # Verify customer belongs to this organization
    result = await db.execute(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.organization_id == organization_id,
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        return {"success": False, "error": "Customer not found"}

    # If invoice specified, verify it and validate amount against balance
    invoice_ref = ""
    if invoice_id:
        inv_result = await db.execute(
            select(Invoice).where(
                Invoice.id == invoice_id,
                Invoice.organization_id == organization_id,
            )
        )
        invoice = inv_result.scalar_one_or_none()
        if not invoice:
            return {"success": False, "error": "Invoice not found"}
        invoice_ref = invoice.invoice_number
        # Prevent overpayment — amount should not exceed balance due
        balance_due = float(invoice.balance_due) if invoice.balance_due else 0
        if amount > balance_due:
            return {
                "success": False,
                "error": f"Amount (KES {amount:,.2f}) exceeds invoice balance of KES {balance_due:,.2f}",
            }

    account_ref = invoice_ref or f"CUST{customer.id.hex[:8].upper()}"

    # Normalize phone to international format for Safaricom API
    phone = _normalize_phone(phone)

    try:
        daraja_resp = await client.stk_push(
            phone=phone,
            amount=amount,
            account_reference=account_ref,
            transaction_desc=f"Payment {account_ref}",
        )
    except DarajaError as e:
        logger.warning("STK Push API error for %s: %s", customer_id, e)
        return {
            "success": False,
            "error": f"M-Pesa error: {str(e)[:200]}",
        }
    except Exception as e:
        logger.error("Unexpected STK Push error for %s: %s", customer_id, e)
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)[:200]}",
        }

    mpesa_tx = MpesaTransaction(
        organization_id=organization_id,
        type="stk_push",
        phone_number=phone,
        amount=amount,
        account_reference=account_ref,
        merchant_request_id=daraja_resp.get("MerchantRequestID"),
        checkout_request_id=daraja_resp.get("CheckoutRequestID"),
        response_code=daraja_resp.get("ResponseCode"),
        response_description=daraja_resp.get("ResponseDescription"),
        raw_request={
            "invoice_id": str(invoice_id),
            "customer_id": str(customer_id),
        }
        if invoice_id
        else {"customer_id": str(customer_id)},
        status="pending",
        customer_id=customer_id,
        invoice_id=invoice_id,
    )
    db.add(mpesa_tx)
    await db.commit()

    if daraja_resp.get("ResponseCode") == "0":
        return {
            "success": True,
            "checkout_request_id": daraja_resp.get("CheckoutRequestID"),
            "merchant_request_id": daraja_resp.get("MerchantRequestID"),
            "message": "STK push sent to phone",
        }
    else:
        mpesa_tx.status = "failed"
        await db.commit()
        return {
            "success": False,
            "error": daraja_resp.get("ResponseDescription", "Unknown error"),
        }


async def handle_stk_callback(
    db: AsyncSession,
    body: dict,
) -> dict:
    try:
        callback_data = body.get("Body", {}).get("stkCallback", {})
        checkout_request_id = callback_data.get("CheckoutRequestID")
        result_code = callback_data.get("ResultCode")
        result_desc = callback_data.get("ResultDesc")

        result = await db.execute(
            select(MpesaTransaction).where(
                MpesaTransaction.checkout_request_id == checkout_request_id
            )
        )
        mpesa_tx = result.scalar_one_or_none()
        if not mpesa_tx:
            logger.warning("Callback for unknown transaction: %s", checkout_request_id)
            return {"success": False, "error": "Transaction not found"}

        mpesa_tx.result_code = str(result_code)
        mpesa_tx.result_description = result_desc
        mpesa_tx.raw_callback = body

        new_status = _map_daraja_status(result_code)

        if new_status == "completed":
            # Guard against duplicate callbacks — only process once
            if mpesa_tx.status == "completed":
                return {"success": True, "status": mpesa_tx.status, "message": "Already processed"}
            mpesa_tx.status = "completed"
            receipt = _extract_receipt(callback_data)
            if receipt:
                mpesa_tx.receipt_number = receipt
                mpesa_tx.transaction_id = receipt

            if mpesa_tx.invoice_id:
                inv_service = InvoiceService(db)
                await inv_service.record_payment(
                    invoice_id=mpesa_tx.invoice_id,
                    amount=float(mpesa_tx.amount),
                    payment_method="mpesa",
                    organization_id=mpesa_tx.organization_id,
                    transaction_code=mpesa_tx.receipt_number or mpesa_tx.transaction_id or "",
                    notes="Auto-matched from STK callback",
                )
        elif new_status == "cancelled":
            mpesa_tx.status = "cancelled"
        elif new_status == "failed":
            mpesa_tx.status = "failed"
        # pending -> leave as-is

        await db.commit()
        return {"success": True, "status": mpesa_tx.status}
    except Exception as e:
        logger.exception("STK callback processing error")
        return {"success": False, "error": str(e)}


async def handle_c2b_confirmation(
    db: AsyncSession,
    body: dict,
) -> dict:
    try:
        trans_id = body.get("TransID", "")
        msisdn = body.get("MSISDN", "")
        amount = float(body.get("TransAmount", 0))
        bill_ref = body.get("BillRefNumber", "")

        result = await db.execute(
            select(MpesaTransaction).where(
                MpesaTransaction.transaction_id == trans_id
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return {"success": True, "message": "Duplicate ignored"}

        org_result = await db.execute(select(Organization).limit(1))
        org = org_result.scalar_one_or_none()
        if not org:
            return {"success": False, "error": "No organization configured"}

        invoice_id = None
        if bill_ref:
            inv_result = await db.execute(
                select(Invoice).where(Invoice.invoice_number == bill_ref)
            )
            invoice = inv_result.scalar_one_or_none()
            if invoice:
                invoice_id = invoice.id

        customer_id = None
        if invoice_id:
            inv_result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
            inv = inv_result.scalar_one_or_none()
            if inv:
                customer_id = inv.customer_id
        else:
            cust_result = await db.execute(
                select(Customer).where(Customer.phone == msisdn)
            )
            cust = cust_result.scalar_one_or_none()
            if cust:
                customer_id = cust.id

        mpesa_tx = MpesaTransaction(
            organization_id=org.id,
            type="c2b",
            phone_number=msisdn,
            amount=amount,
            account_reference=bill_ref,
            transaction_id=trans_id,
            receipt_number=trans_id,
            raw_callback=body,
            status="completed",
            customer_id=customer_id,
            invoice_id=invoice_id,
        )
        db.add(mpesa_tx)

        if invoice_id:
            inv_service = InvoiceService(db)
            await inv_service.record_payment(
                invoice_id=invoice_id,
                amount=amount,
                payment_method="mpesa",
                organization_id=org.id,
                transaction_code=trans_id,
                notes="C2B confirmation",
            )

        await db.commit()
        return {"success": True}
    except Exception as e:
        logger.exception("C2B confirmation error")
        return {"success": False, "error": str(e)}


async def handle_c2b_validation(body: dict) -> dict:
    return {
        "ResultCode": 0,
        "ResultDesc": "Accepted",
    }


async def query_transaction_status(
    db: AsyncSession,
    checkout_request_id: str,
    client: "DarajaClient",
) -> dict:
    # First, get current DB state before calling Daraja
    result = await db.execute(
        select(MpesaTransaction).where(
            MpesaTransaction.checkout_request_id == checkout_request_id
        )
    )
    mpesa_tx = result.scalar_one_or_none()
    if not mpesa_tx:
        return {
            "status": "not_found",
            "result_code": None,
            "result_desc": "Transaction not found",
        }

    # If already terminal, don't query again
    if mpesa_tx.status in ("completed", "cancelled", "failed"):
        return {
            "status": mpesa_tx.status,
            "result_code": mpesa_tx.result_code,
            "result_desc": mpesa_tx.result_description,
            "receipt_number": mpesa_tx.receipt_number,
            "transaction_id": mpesa_tx.transaction_id,
        }

    # Query Daraja — wrap in try/except so sandbox errors don't crash polling
    try:
        daraja_resp = await client.query_status(checkout_request_id)
    except DarajaError as e:
        logger.warning("Status query failed for %s: %s", checkout_request_id, e)
        return {
            "status": mpesa_tx.status,
            "result_code": None,
            "result_desc": f"Query failed: {str(e)[:200]}",
            "receipt_number": mpesa_tx.receipt_number,
            "transaction_id": mpesa_tx.transaction_id,
        }
    except Exception as e:
        logger.warning("Status query unexpected error for %s: %s", checkout_request_id, e)
        return {
            "status": mpesa_tx.status,
            "result_code": None,
            "result_desc": f"Query failed: {str(e)[:200]}",
            "receipt_number": mpesa_tx.receipt_number,
            "transaction_id": mpesa_tx.transaction_id,
        }

    result_code = daraja_resp.get("ResultCode")
    result_desc = daraja_resp.get("ResultDesc", "")

    mpesa_tx.result_code = result_code
    mpesa_tx.result_description = result_desc
    mpesa_tx.raw_callback = daraja_resp

    new_status = _map_daraja_status(result_code)
    if new_status != "pending":
        mpesa_tx.status = new_status
        if new_status == "completed":
            receipt = _extract_receipt(daraja_resp)
            if receipt:
                mpesa_tx.receipt_number = receipt
                mpesa_tx.transaction_id = receipt

    await db.commit()
    await db.refresh(mpesa_tx)

    return {
        "status": mpesa_tx.status,
        "result_code": result_code,
        "result_desc": result_desc,
        "receipt_number": mpesa_tx.receipt_number,
        "transaction_id": mpesa_tx.transaction_id,
    }


async def list_transactions(
    db: AsyncSession,
    organization_id: uuid.UUID,
    status: str | None = None,
    customer_id: uuid.UUID | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> tuple[list[MpesaTransaction], int]:
    """Return (transactions, total_count) for the given filters."""
    from sqlalchemy import func as sqlfunc

    base_query = select(MpesaTransaction).where(
        MpesaTransaction.organization_id == organization_id
    )

    # Count query
    count_query = select(sqlfunc.count(MpesaTransaction.id)).where(
        MpesaTransaction.organization_id == organization_id
    )

    if status:
        base_query = base_query.where(MpesaTransaction.status == status)
        count_query = count_query.where(MpesaTransaction.status == status)
    if customer_id:
        base_query = base_query.where(MpesaTransaction.customer_id == customer_id)
        count_query = count_query.where(MpesaTransaction.customer_id == customer_id)
    if date_from:
        base_query = base_query.where(MpesaTransaction.created_at >= date_from)
        count_query = count_query.where(MpesaTransaction.created_at >= date_from)
    if date_to:
        base_query = base_query.where(MpesaTransaction.created_at <= date_to)
        count_query = count_query.where(MpesaTransaction.created_at <= date_to)
    if search:
        search_pattern = f"%{search}%"
        filter_clause = (
            (MpesaTransaction.phone_number.ilike(search_pattern))
            | (MpesaTransaction.receipt_number.ilike(search_pattern))
            | (MpesaTransaction.account_reference.ilike(search_pattern))
        )
        base_query = base_query.where(filter_clause)
        count_query = count_query.where(filter_clause)

    base_query = (
        base_query.order_by(MpesaTransaction.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    result = await db.execute(base_query)
    txs = list(result.scalars().all())
    return txs, total


async def reconcile_pending(
    db: AsyncSession,
    client: "DarajaClient",
) -> list[dict]:
    """Query Daraja for all pending STK push transactions.

    Transactions older than PENDING_TIMEOUT_HOURS are auto-failed.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=PENDING_TIMEOUT_HOURS)

    result = await db.execute(
        select(MpesaTransaction).where(
            MpesaTransaction.status == "pending",
            MpesaTransaction.type.in_(["stk_push"]),
        )
    )
    pending = result.scalars().all()
    results = []
    for tx in pending:
        # Auto-fail transactions that have been pending too long
        if tx.created_at and tx.created_at < cutoff:
            tx.status = "failed"
            tx.result_description = "Timed out after 24 hours without confirmation"
            results.append({"id": str(tx.id), "status": "failed"})
            continue

        if not tx.checkout_request_id:
            continue

        try:
            daraja_resp = await client.query_status(tx.checkout_request_id)
            result_code = daraja_resp.get("ResultCode")
            tx.raw_callback = daraja_resp
            tx.result_code = result_code

            new_status = _map_daraja_status(result_code)
            if new_status != "pending":
                tx.status = new_status
                if new_status == "completed":
                    receipt = _extract_receipt(daraja_resp)
                    if receipt:
                        tx.receipt_number = receipt
                        tx.transaction_id = receipt
                results.append({"id": str(tx.id), "status": new_status})
            else:
                results.append({"id": str(tx.id), "status": "pending"})
        except DarajaError as e:
            logger.warning("Reconciliation query failed for %s: %s", tx.id, e)
            results.append({"id": str(tx.id), "status": "pending"})
        except Exception as e:
            logger.exception("Reconciliation unexpected error for %s", tx.id)
            results.append({"id": str(tx.id), "status": "pending"})

    await db.commit()
    return results
