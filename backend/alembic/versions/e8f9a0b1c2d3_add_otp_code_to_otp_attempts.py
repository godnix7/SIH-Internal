"""add otp_code and expires_at to otp_attempts

Revision ID: e8f9a0b1c2d3
Revises: f571b74b2eaa
Create Date: 2026-07-27 16:56:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e8f9a0b1c2d3'
down_revision: Union[str, Sequence[str], None] = '15e60164a262'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column("otp_attempts", sa.Column("otp_code", sa.String(), nullable=True), schema="auth")
    op.add_column("otp_attempts", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True), schema="auth")

def downgrade() -> None:
    op.drop_column("otp_attempts", "expires_at", schema="auth")
    op.drop_column("otp_attempts", "otp_code", schema="auth")
