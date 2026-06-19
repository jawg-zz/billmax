import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Header, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.customer import Customer

PORTAL_ALGORITHM = "HS256"
PORTAL_TOKEN_EXPIRE_DAYS = 7


def create_portal_token(customer_id: uuid.UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=PORTAL_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(customer_id), "exp": expire, "type": "portal"}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=PORTAL_ALGORITHM)


async def get_portal_customer(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Customer:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[PORTAL_ALGORITHM])
        if payload.get("type") != "portal":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        customer_id = uuid.UUID(payload.get("sub"))
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer
