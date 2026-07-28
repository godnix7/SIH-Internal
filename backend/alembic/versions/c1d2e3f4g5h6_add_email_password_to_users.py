"""add email password to users

Revision ID: c1d2e3f4g5h6
Revises: a1b2c3d4e5f6
Create Date: 2026-07-28 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4g5h6'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add email column
    op.add_column('users', sa.Column('email', sa.String(), nullable=True), schema='auth')
    # Add password_hash column
    op.add_column('users', sa.Column('password_hash', sa.String(), nullable=True), schema='auth')
    # Alter phone_enc to be nullable
    op.alter_column('users', 'phone_enc',
        existing_type=sa.LargeBinary(),
        nullable=True,
        schema='auth'
    )
    # Create unique index on email
    op.create_index('idx_users_email', 'users', ['email'], unique=True, schema='auth')


def downgrade() -> None:
    op.drop_index('idx_users_email', table_name='users', schema='auth')
    op.alter_column('users', 'phone_enc',
        existing_type=sa.LargeBinary(),
        nullable=False,
        schema='auth'
    )
    op.drop_column('users', 'password_hash', schema='auth')
    op.drop_column('users', 'email', schema='auth')
