import uuid
from datetime import datetime

from pydantic import BaseModel


class UsageRecordCreate(BaseModel):
    subscription_id: uuid.UUID
    download_bytes: int = 0
    upload_bytes: int = 0
    total_bytes: int = 0
    period_start: datetime
    period_end: datetime
    source: str = "api"


class UsageRecordRead(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    subscription_id: uuid.UUID
    period_start: datetime
    period_end: datetime
    download_bytes: int
    upload_bytes: int
    total_bytes: int
    source: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UsageAlertRead(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    subscription_id: uuid.UUID
    alert_type: str
    message: str
    threshold_percent: int
    current_usage_gb: float
    data_cap_gb: float
    action_taken: str | None
    acknowledged: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UsageSummary(BaseModel):
    subscription_id: uuid.UUID
    customer_name: str
    plan_name: str
    data_cap_gb: float | None
    download_gb: float
    upload_gb: float
    total_gb: float
    usage_percent: float
    period_start: datetime
    period_end: datetime
