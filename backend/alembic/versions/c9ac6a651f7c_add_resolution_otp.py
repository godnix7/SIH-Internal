"""Add resolution_otp

Revision ID: c9ac6a651f7c
Revises: d1e2f3g4h5i6
Create Date: 2026-07-29 21:33:34.389035

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9ac6a651f7c'
down_revision: Union[str, Sequence[str], None] = 'd1e2f3g4h5i6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('incidents', sa.Column('resolution_otp', sa.String(), nullable=True), schema='incident')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('incidents', 'resolution_otp', schema='incident')
