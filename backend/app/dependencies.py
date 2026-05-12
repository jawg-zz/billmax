from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth import current_user
from app.models.user import User

security_scheme = HTTPBearer()


def require_role(*roles: str):
    async def role_checker(user: User = Depends(current_user)) -> User:
        if user.role not in roles and not user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(roles)}",
            )
        return user
    return role_checker


AdminOnly = require_role("admin")
BillingStaff = require_role("admin", "billing")
SupportStaff = require_role("admin", "support")
TechStaff = require_role("admin", "tech")
AnyStaff = require_role("admin", "billing", "support", "tech")
