from pydantic import BaseModel


class ProvisioningActionResponse(BaseModel):
    success: bool
    action: str
    subscription_id: str
    backend: str
    details: dict | None = None
