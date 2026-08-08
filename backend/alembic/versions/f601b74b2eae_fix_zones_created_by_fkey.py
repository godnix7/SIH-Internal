"""fix_zones_created_by_fkey

Revision ID: f601b74b2eae
Revises: f601b74b2ead
Create Date: 2026-08-08 12:45:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f601b74b2eae'
down_revision = 'f601b74b2ead'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Drop the old foreign key constraint pointing to auth.users
    op.drop_constraint('zones_created_by_fkey', 'zones', schema='geofence', type_='foreignkey')
    # Create the new foreign key constraint pointing to auth.internal_users
    op.create_foreign_key(
        'zones_created_by_fkey',
        source_table='zones',
        referent_table='internal_users',
        local_cols=['created_by'],
        remote_cols=['id'],
        source_schema='geofence',
        referent_schema='auth'
    )

def downgrade() -> None:
    # Drop the new foreign key constraint pointing to auth.internal_users
    op.drop_constraint('zones_created_by_fkey', 'zones', schema='geofence', type_='foreignkey')
    # Re-create the old foreign key constraint pointing to auth.users
    op.create_foreign_key(
        'zones_created_by_fkey',
        source_table='zones',
        referent_table='users',
        local_cols=['created_by'],
        remote_cols=['id'],
        source_schema='geofence',
        referent_schema='auth'
    )
