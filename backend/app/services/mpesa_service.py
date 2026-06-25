import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.integrations.mpesa.daraja import DarajaClient
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.mpesa import MpesaTransaction
from app.models.organization import Organization
from app.services.invoice_service import InvoiceService


async def initiate_stk_push(
    db: AsyncSession,
    organization_id: uuid.UUID,
    invoice_id: uuid.UUID | None,
    customer_id: uuid.UUID,
    phone: str,
    amount: float,
    client: "DarajaClient",
) -> dict:
    result = await db.execute(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.organization_id == organization_id,
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        return {"success": False, "error": "Customer not found"}

    if amount <= 0:
        return {"success": False, "error": "Amount must be greater than 0"}

    invoice_ref = ""
    if invoice_id:
        inv_result = await db.execute(
            select(Invoice).where(
                Invoice.id == invoice_id,
                Invoice.organization_id == organization_id,
            )
        )
        invoice = inv_result.scalar_one_or_none()
        if invoice:
            invoice_ref = invoice.invoice_number

    account_ref = invoice_ref or f"CUST{customer.id.hex[:8].upper()}"

    try:
        daraja_resp = await client.stk_push(
            phone=phone,
            amount=amount,
            account_reference=account_ref,
            transaction_desc=f"Payment {account_ref}",
        )
    except Exception as e:
        return {
            "success": False,
            "error": f"M-Pesa API error: {str(e)[:200]}",
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
        raw_request={"invoice_id": str(invoice_id), "customer_id": str(customer_id)} if invoice_id else {"customer_id": str(customer_id)},
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
            return {"success": False, "error": "Transaction not found"}

        mpesa_tx.result_code = str(result_code)
        mpesa_tx.result_description = result_desc
        mpesa_tx.raw_callback = body

        callback_items = callback_data.get("CallbackMetadata", {}).get("Item", [])

        if str(result_code) == "0":
            # Guard against duplicate callbacks — only process once
            if mpesa_tx.status == "completed":
                return {"success": True, "status": mpesa_tx.status, "message": "Already processed"}
            mpesa_tx.status = "completed"
            for item in callback_items:
                name = item.get("Name")
                value = item.get("Value")
                if name == "MpesaReceiptNumber":
                    mpesa_tx.receipt_number = str(value)
                    mpesa_tx.transaction_id = str(value)

            if mpesa_tx.invoice_id:
                inv_service = InvoiceService(db)
                await inv_service.record_payment(
                    invoice_id=mpesa_tx.invoice_id,
                    amount=float(mpesa_tx.amount),
                    payment_method="mpesa",
                    organization_id=mpesa_tx.organization_id,
                    transaction_code=mpesa_tx.receipt_number or mpesa_tx.transaction_id,
                    notes="Auto-matched from STK callback",
                )
        else:
            mpesa_tx.status = "failed"

        await db.commit()
        return {"success": True, "status": mpesa_tx.status}
    except Exception as e:
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
    daraja_resp = await client.query_status(checkout_request_id)

    result = await db.execute(
        select(MpesaTransaction).where(
            MpesaTransaction.checkout_request_id == checkout_request_id
        )
    )
    mpesa_tx = result.scalar_one_or_none()
    if mpesa_tx:
        mpesa_tx.result_code = daraja_resp.get("ResultCode")
        mpesa_tx.result_description = daraja_resp.get("ResultDesc")
        mpesa_tx.raw_callback = daraja_resp
        if daraja_resp.get("ResultCode") == "0":
            mpesa_tx.status = "completed"
        elif daraja_resp.get("ResultCode"):
            mpesa_tx.status = "failed"
        await db.commit()

    return daraja_resp


async def list_transactions(
    db: AsyncSession,
    organization_id: uuid.UUID,
    status: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[MpesaTransaction]:
    query = select(MpesaTransaction).where(
        MpesaTransaction.organization_id == organization_id
    )
    if status:
        query = query.where(MpesaTransaction.status == status)
    query = query.order_by(MpesaTransaction.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def reconcile_pending(
    db: AsyncSession,
    client: "DarajaClient",
) -> list[dict]:
    result = await db.execute(
        select(MpesaTransaction).where(
            MpesaTransaction.status == "pending",
            MpesaTransaction.type.in_(["stk_push"]),
        )
    )
    pending = result.scalars().all()
    results = []
    for tx in pending:
        if tx.checkout_request_id:
            daraja_resp = await client.query_status(tx.checkout_request_id)
            result_code = daraja_resp.get("ResultCode")
            tx.raw_callback = daraja_resp
            if result_code == "0":
                tx.status = "completed"
                results.append({"id": str(tx.id), "status": "completed"})
            elif result_code and result_code != "0":
                tx.status = "failed"
                results.append({"id": str(tx.id), "status": "failed"})
    await db.commit()
    return results
