"""split_internal_auth

Revision ID: 15e60164a262
Revises: f14a145eea17
Create Date: 2026-07-21 09:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '15e60164a262'
down_revision: Union[str, Sequence[str], None] = 'e0372e6ddab7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('internal_users',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('password_hash', sa.String(), nullable=False),
    sa.Column('role', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    schema='auth'
    )
    op.create_index(op.f('ix_auth_internal_users_email'), 'internal_users', ['email'], unique=True, schema='auth')
    op.create_index(op.f('ix_auth_internal_users_role'), 'internal_users', ['role'], unique=False, schema='auth')

    op.create_table('internal_sessions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('internal_user_id', sa.UUID(), nullable=False),
    sa.Column('refresh_token_hash', sa.String(), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    schema='auth'
    )
    op.create_index(op.f('ix_auth_internal_sessions_refresh_token_hash'), 'internal_sessions', ['refresh_token_hash'], unique=True, schema='auth')


def downgrade() -> None:
    op.drop_table('internal_sessions', schema='auth')
    op.drop_table('internal_users', schema='auth')
