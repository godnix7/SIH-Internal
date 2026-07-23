"""Phase A Audit and Facility updates

Revision ID: e0372e6ddab7
Revises: 7a45369e85c2
Create Date: 2026-07-20 09:55:14.949396

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e0372e6ddab7'
down_revision: Union[str, Sequence[str], None] = '7a45369e85c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add new columns to Facilities
    op.add_column('facilities', sa.Column('capacity', sa.Integer(), nullable=True))
    op.add_column('facilities', sa.Column('emergency_beds', sa.Integer(), nullable=True))
    op.add_column('facilities', sa.Column('available_ambulances', sa.Integer(), nullable=True))
    op.add_column('facilities', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))

    # 2. Create Audit Logs table
    op.create_table('audit_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('actor_id', sa.UUID(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('resource_type', sa.String(), nullable=False),
        sa.Column('resource_id', sa.String(), nullable=False),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('user_agent', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['auth.users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        schema='public'
    )
    op.create_index(op.f('ix_public_audit_logs_action'), 'audit_logs', ['action'], unique=False, schema='public')
    op.create_index(op.f('ix_public_audit_logs_actor_id'), 'audit_logs', ['actor_id'], unique=False, schema='public')
    op.create_index(op.f('ix_public_audit_logs_resource_id'), 'audit_logs', ['resource_id'], unique=False, schema='public')
    op.create_index(op.f('ix_public_audit_logs_resource_type'), 'audit_logs', ['resource_type'], unique=False, schema='public')


def downgrade() -> None:
    # 2. Drop Audit Logs table
    op.drop_index(op.f('ix_public_audit_logs_resource_type'), table_name='audit_logs', schema='public')
    op.drop_index(op.f('ix_public_audit_logs_resource_id'), table_name='audit_logs', schema='public')
    op.drop_index(op.f('ix_public_audit_logs_actor_id'), table_name='audit_logs', schema='public')
    op.drop_index(op.f('ix_public_audit_logs_action'), table_name='audit_logs', schema='public')
    op.drop_table('audit_logs', schema='public')

    # 1. Remove columns from Facilities
    op.drop_column('facilities', 'deleted_at')
    op.drop_column('facilities', 'available_ambulances')
    op.drop_column('facilities', 'emergency_beds')
    op.drop_column('facilities', 'capacity')
