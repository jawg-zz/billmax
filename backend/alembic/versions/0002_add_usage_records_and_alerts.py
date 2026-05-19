"""Add usage_records and usage_alerts tables

Revision ID: 0002
Revises: None
Create Date: 2026-05-19
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0002"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "usage_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("subscription_id", UUID(as_uuid=True), sa.ForeignKey("subscriptions.id"), nullable=False),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("download_bytes", sa.Integer(), default=0),
        sa.Column("upload_bytes", sa.Integer(), default=0),
        sa.Column("total_bytes", sa.Integer(), default=0),
        sa.Column("source", sa.String(50), default="api"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_usage_records_org_sub", "usage_records", ["organization_id", "subscription_id"])
    op.create_index("ix_usage_records_created", "usage_records", ["created_at"])

    op.create_table(
        "usage_alerts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("subscription_id", UUID(as_uuid=True), sa.ForeignKey("subscriptions.id"), nullable=False),
        sa.Column("alert_type", sa.String(50), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("threshold_percent", sa.Integer(), nullable=False),
        sa.Column("current_usage_gb", sa.Float(), nullable=False),
        sa.Column("data_cap_gb", sa.Float(), nullable=False),
        sa.Column("action_taken", sa.String(50), nullable=True),
        sa.Column("acknowledged", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_usage_alerts_org_sub", "usage_alerts", ["organization_id", "subscription_id"])
    op.create_index("ix_usage_alerts_type", "usage_alerts", ["alert_type"])


def downgrade() -> None:
    op.drop_table("usage_alerts")
    op.drop_table("usage_records")
