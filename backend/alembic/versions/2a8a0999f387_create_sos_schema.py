"""create_sos_schema

Revision ID: 2a8a0999f387
Revises: 3f8b01288f19
Create Date: 2026-07-15 09:17:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

# revision identifiers, used by Alembic.
revision = '2a8a0999f387'
down_revision = '3f8b01288f19'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create schemas
    op.execute("CREATE SCHEMA IF NOT EXISTS sos")
    op.execute("CREATE SCHEMA IF NOT EXISTS incident")

    # Create sos.sos_alerts
    op.create_table('sos_alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('client_sos_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('trip_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('incident_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('type', sa.String(), server_default='general', nullable=False),
        sa.Column('location', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326, from_text='ST_GeomFromEWKT', name='geometry'), nullable=True),
        sa.Column('accuracy_m', sa.Float(), nullable=True),
        sa.Column('location_ts', sa.DateTime(timezone=True), nullable=True),
        sa.Column('battery_pct', sa.SmallInteger(), nullable=True),
        sa.Column('network_type', sa.String(), nullable=True),
        sa.Column('note', sa.String(), nullable=True),
        sa.Column('source', sa.String(), server_default='app', nullable=False),
        sa.Column('covert', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('status', sa.String(), server_default='received', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.trips.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['auth.users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('client_sos_id'),
        schema='sos'
    )
    op.create_index('idx_sos_user', 'sos_alerts', ['user_id'], unique=False, schema='sos')

    # Create incident.incidents
    op.create_table('incidents',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('sos_alert_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('trip_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('severity', sa.String(), nullable=False),
        sa.Column('status', sa.String(), server_default='created', nullable=False),
        sa.Column('jurisdiction', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('assigned_to', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('location', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326, from_text='ST_GeomFromEWKT', name='geometry'), nullable=True),
        sa.Column('disposition_code', sa.String(), nullable=True),
        sa.Column('summary', sa.String(), nullable=True),
        sa.Column('merged_into', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('chain_head', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['merged_into'], ['incident.incidents.id'], ),
        sa.ForeignKeyConstraint(['sos_alert_id'], ['sos.sos_alerts.id'], ),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.trips.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['auth.users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        schema='incident'
    )
    op.create_index('idx_incidents_user', 'incidents', ['user_id'], unique=False, schema='incident')

    # Create incident.incident_events
    op.create_table('incident_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('incident_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('actor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('details', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['incident_id'], ['incident.incidents.id'], ),
        sa.PrimaryKeyConstraint('id'),
        schema='incident'
    )


def downgrade() -> None:
    op.drop_table('incident_events', schema='incident')
    op.drop_index('idx_incidents_user', table_name='incidents', schema='incident')
    op.drop_table('incidents', schema='incident')
    op.drop_index('idx_sos_user', table_name='sos_alerts', schema='sos')
    op.drop_table('sos_alerts', schema='sos')
    op.execute("DROP SCHEMA IF EXISTS incident CASCADE")
    op.execute("DROP SCHEMA IF EXISTS sos CASCADE")
