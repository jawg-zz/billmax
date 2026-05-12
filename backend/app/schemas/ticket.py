import uuid
from datetime import datetime

from pydantic import BaseModel


class TicketCreate(BaseModel):
    customer_id: uuid.UUID
    subject: str
    description: str
    priority: str = "medium"


class TicketUpdate(BaseModel):
    status: str | None = None
    priority: str | None = None
    assigned_to: uuid.UUID | None = None


class TicketRead(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    customer_id: uuid.UUID
    subject: str
    description: str
    priority: str
    status: str
    assigned_to: uuid.UUID | None = None
    resolved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketCommentCreate(BaseModel):
    comment: str
    is_internal: bool = False


class TicketCommentRead(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    user_id: uuid.UUID | None = None
    comment: str
    is_internal: bool
    created_at: datetime

    model_config = {"from_attributes": True}
