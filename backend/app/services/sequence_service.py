import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sequence_number import SequenceNumber


async def next_invoice_number(
    db: AsyncSession,
    organization_id: uuid.UUID,
    prefix: str = "INV",
) -> str:
    year = datetime.now(timezone.utc).year
    result = await db.execute(
        select(SequenceNumber).where(
            SequenceNumber.organization_id == organization_id,
            SequenceNumber.prefix == prefix,
            SequenceNumber.year == year,
        ).with_for_update()
    )
    seq = result.scalar_one_or_none()

    if seq:
        seq.last_number += 1
        number = seq.last_number
    else:
        seq = SequenceNumber(
            organization_id=organization_id,
            prefix=prefix,
            year=year,
            last_number=1,
        )
        db.add(seq)
        number = 1

    await db.flush()
    return f"{prefix}-{year}{number:05d}"
