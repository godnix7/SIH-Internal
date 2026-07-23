"""Add confidence and details to RiskEvent

Revision ID: f14a145eea17
Revises: ee6a8a9231ea
Create Date: 2026-07-18 20:25:55.707876

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f14a145eea17'
down_revision: Union[str, Sequence[str], None] = 'ee6a8a9231ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add confidence and details to risk_events
    op.add_column('risk_events', sa.Column('confidence', sa.Integer(), nullable=False, server_default='0'), schema='trips')
    op.add_column('risk_events', sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True), schema='trips')

    # Create blockchain schema and tables
    op.execute('CREATE SCHEMA IF NOT EXISTS blockchain')
    op.create_table('merkle_anchors',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('merkle_root', sa.String(), nullable=False),
    sa.Column('included_hashes', sa.JSON(), nullable=False),
    sa.Column('transaction_id', sa.String(), nullable=True),
    sa.Column('anchored_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('merkle_root'),
    schema='blockchain'
    )
    op.create_table('event_chain',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('incident_id', sa.UUID(), nullable=False),
    sa.Column('event_id', sa.UUID(), nullable=False),
    sa.Column('previous_hash', sa.String(), nullable=True),
    sa.Column('hash', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['event_id'], ['incident.incident_events.id'], ),
    sa.ForeignKeyConstraint(['incident_id'], ['incident.incidents.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('event_id'),
    sa.UniqueConstraint('hash'),
    schema='blockchain'
    )
    op.create_index(op.f('ix_blockchain_event_chain_incident_id'), 'event_chain', ['incident_id'], unique=False, schema='blockchain')


def downgrade() -> None:
    op.drop_column('risk_events', 'details', schema='trips')
    op.drop_column('risk_events', 'confidence', schema='trips')
    op.drop_table('event_chain', schema='blockchain')
    op.drop_table('merkle_anchors', schema='blockchain')
