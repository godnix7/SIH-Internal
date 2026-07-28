"""remove_otp_add_internal_user_fields

Revision ID: a1b2c3d4e5f6
Revises: 15e60164a262
Create Date: 2026-07-28 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '15e60164a262'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add name, phone, organization columns to internal_users
    op.add_column('internal_users', sa.Column('name', sa.String(), nullable=True), schema='auth')
    op.add_column('internal_users', sa.Column('phone', sa.String(), nullable=True), schema='auth')
    op.add_column('internal_users', sa.Column('organization', sa.String(), nullable=True), schema='auth')

    # 2. Make users.phone_hash nullable (was unique+not-null, now phone is optional since email is primary)
    op.alter_column('users', 'phone_hash',
        existing_type=sa.String(),
        nullable=True,
        schema='auth'
    )

    # 3. Drop the otp_attempts table (OTP system removed)
    op.drop_table('otp_attempts', schema='auth')


def downgrade() -> None:
    # Recreate otp_attempts table
    op.create_table('otp_attempts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('phone_hash', sa.String(), nullable=False),
        sa.Column('otp_code', sa.String(), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        schema='auth'
    )

    # Restore users.phone_hash as not-null
    op.alter_column('users', 'phone_hash',
        existing_type=sa.String(),
        nullable=False,
        schema='auth'
    )

    # Drop added columns from internal_users
    op.drop_column('internal_users', 'organization', schema='auth')
    op.drop_column('internal_users', 'phone', schema='auth')
    op.drop_column('internal_users', 'name', schema='auth')
