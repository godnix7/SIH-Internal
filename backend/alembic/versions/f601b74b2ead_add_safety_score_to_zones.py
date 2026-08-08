"""add safety score to zones

Revision ID: f601b74b2ead
Revises: f601b74b2eac
Create Date: 2026-08-08 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f601b74b2ead'
down_revision: Union[str, None] = 'f601b74b2eac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('zones', sa.Column('safety_score', sa.Integer(), nullable=False, server_default='100'), schema='geofence')
    op.add_column('zones', sa.Column('crime_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]'), schema='geofence')
    op.add_column('zones', sa.Column('risk_factors', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]'), schema='geofence')
    op.add_column('zones', sa.Column('total_incidents', sa.Integer(), nullable=False, server_default='0'), schema='geofence')


def downgrade() -> None:
    op.drop_column('zones', 'total_incidents', schema='geofence')
    op.drop_column('zones', 'risk_factors', schema='geofence')
    op.drop_column('zones', 'crime_data', schema='geofence')
    op.drop_column('zones', 'safety_score', schema='geofence')
