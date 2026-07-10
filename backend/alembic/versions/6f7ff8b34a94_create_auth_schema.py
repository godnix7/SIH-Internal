"""create auth schema

Revision ID: 6f7ff8b34a94
Revises: 
Create Date: 2026-07-15 14:11:54.456248

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f7ff8b34a94'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create schema
    op.execute("CREATE SCHEMA IF NOT EXISTS auth")
    
    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("phone_hash", sa.String(), nullable=False),
        sa.Column("phone_enc", sa.LargeBinary(), nullable=False),
        sa.Column("role", sa.String(), server_default="tourist", nullable=False),
        sa.Column("language", sa.String(), server_default="en", nullable=False),
        sa.Column("status", sa.String(), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("phone_hash"),
        sa.CheckConstraint("role IN ('tourist','operator','dispatcher','supervisor','hospital','tourism_admin','sys_admin','auditor')"),
        sa.CheckConstraint("status IN ('active','suspended','deleted')"),
        schema="auth"
    )
    op.create_index("idx_users_phone", "users", ["phone_hash"], unique=True, schema="auth")
    op.create_index("idx_users_role", "users", ["role"], schema="auth", postgresql_where=sa.text("status = 'active'"))

    # Create devices table
    op.create_table(
        "devices",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("device_fingerprint", sa.String(), nullable=False),
        sa.Column("platform", sa.String(), nullable=False),
        sa.Column("sos_token", sa.String(), nullable=False),
        sa.Column("push_token", sa.String(), nullable=True),
        sa.Column("attestation", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sos_token"),
        sa.UniqueConstraint("user_id", "device_fingerprint"),
        sa.ForeignKeyConstraint(["user_id"], ["auth.users.id"]),
        sa.CheckConstraint("platform IN ('android','ios','web')"),
        schema="auth"
    )

    # Create sessions table
    op.create_table(
        "sessions",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("device_id", sa.UUID(), nullable=False),
        sa.Column("refresh_token_hash", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("refresh_token_hash"),
        sa.ForeignKeyConstraint(["user_id"], ["auth.users.id"]),
        sa.ForeignKeyConstraint(["device_id"], ["auth.devices.id"]),
        schema="auth"
    )

    # Create otp_attempts table
    op.create_table(
        "otp_attempts",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("phone_hash", sa.String(), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("phone_hash"),
        schema="auth"
    )

def downgrade() -> None:
    op.drop_table("otp_attempts", schema="auth")
    op.drop_table("sessions", schema="auth")
    op.drop_table("devices", schema="auth")
    op.drop_table("users", schema="auth")
    op.execute("DROP SCHEMA IF EXISTS auth CASCADE")
