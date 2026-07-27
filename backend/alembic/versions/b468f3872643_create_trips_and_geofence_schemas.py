"""create_trips_and_geofence_schemas

Revision ID: b468f3872643
Revises: 6f7ff8b34a94
Create Date: 2026-07-15 08:52:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

# revision identifiers, used by Alembic.
revision = 'b468f3872643'
down_revision = '6f7ff8b34a94'
branch_labels = None
depends_on = None

def get_spatial_type(geometry_type='GEOMETRY', srid=4326):
    try:
        op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
        return geoalchemy2.types.Geometry(geometry_type=geometry_type, srid=srid, from_text='ST_GeomFromEWKT', name='geometry')
    except Exception:
        return sa.Text()

def upgrade() -> None:
    # Ensure PostGIS extension exists if supported
    try:
        op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    except Exception:
        pass

    # Create schemas
    op.execute("CREATE SCHEMA IF NOT EXISTS trips")
    op.execute("CREATE SCHEMA IF NOT EXISTS geofence")

    # Create trips table
    op.create_table(
        'trips',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('destination', sa.String(), nullable=False),
        sa.Column('destination_point', get_spatial_type('POINT', 4326), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('consent_tier', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='draft'),
        sa.Column('checkin_interval_minutes', sa.Integer(), nullable=True),
        sa.Column('zone_pack_version', sa.Integer(), nullable=True),
        sa.Column('monitoring_mode', sa.String(), server_default='IDLE', nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['auth.users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        schema='trips'
    )
    op.create_index(op.f('ix_trips_trips_status'), 'trips', ['status'], unique=False, schema='trips')
    op.create_index(op.f('ix_trips_trips_user_id'), 'trips', ['user_id'], unique=False, schema='trips')

    # Create consent_receipts table
    op.create_table(
        'consent_receipts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('trip_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('consent_tier', sa.String(), nullable=False),
        sa.Column('previous_tier', sa.String(), nullable=True),
        sa.Column('purpose_text', sa.Text(), nullable=False),
        sa.Column('granted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('withdrawn_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('receipt_hash', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.trips.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['auth.users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        schema='trips'
    )
    op.create_index(op.f('ix_trips_consent_receipts_user_id'), 'consent_receipts', ['user_id'], unique=False, schema='trips')

    # Create zones table
    op.create_table(
        'zones',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('class', sa.String(), nullable=False),
        sa.Column('geometry', get_spatial_type('POLYGON', 4326), nullable=False),
        sa.Column('buffer_m', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('schedule', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='draft'),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['auth.users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        schema='geofence'
    )
    op.create_index(op.f('ix_geofence_zones_status'), 'zones', ['status'], unique=False, schema='geofence')


def downgrade() -> None:
    op.drop_table('zones', schema='geofence')
    op.drop_table('consent_receipts', schema='trips')
    op.drop_table('trips', schema='trips')
    op.execute("DROP SCHEMA IF EXISTS geofence")
    op.execute("DROP SCHEMA IF EXISTS trips")
