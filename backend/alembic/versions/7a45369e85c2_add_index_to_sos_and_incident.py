"""Add index to SOS and Incident

Revision ID: 7a45369e85c2
Revises: f14a145eea17
Create Date: 2026-07-20 09:41:39.566523

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a45369e85c2'
down_revision: Union[str, Sequence[str], None] = 'f14a145eea17'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # SOS Alerts Indices
    op.create_index(op.f('ix_sos_sos_alerts_client_sos_id'), 'sos_alerts', ['client_sos_id'], unique=True, schema='sos')
    op.create_index(op.f('ix_sos_sos_alerts_user_id'), 'sos_alerts', ['user_id'], unique=False, schema='sos')
    op.create_index(op.f('ix_sos_sos_alerts_trip_id'), 'sos_alerts', ['trip_id'], unique=False, schema='sos')
    op.create_index(op.f('ix_sos_sos_alerts_incident_id'), 'sos_alerts', ['incident_id'], unique=False, schema='sos')
    op.create_index(op.f('ix_sos_sos_alerts_status'), 'sos_alerts', ['status'], unique=False, schema='sos')

    # Incidents Indices
    op.create_index(op.f('ix_incident_incidents_sos_alert_id'), 'incidents', ['sos_alert_id'], unique=False, schema='incident')
    op.create_index(op.f('ix_incident_incidents_user_id'), 'incidents', ['user_id'], unique=False, schema='incident')
    op.create_index(op.f('ix_incident_incidents_trip_id'), 'incidents', ['trip_id'], unique=False, schema='incident')
    op.create_index(op.f('ix_incident_incidents_status'), 'incidents', ['status'], unique=False, schema='incident')
    op.create_index(op.f('ix_incident_incidents_jurisdiction'), 'incidents', ['jurisdiction'], unique=False, schema='incident')
    op.create_index(op.f('ix_incident_incidents_assigned_to'), 'incidents', ['assigned_to'], unique=False, schema='incident')

    # Incident Events Indices
    op.create_index(op.f('ix_incident_incident_events_incident_id'), 'incident_events', ['incident_id'], unique=False, schema='incident')


def downgrade() -> None:
    """Downgrade schema."""
    # Incident Events Indices
    op.drop_index(op.f('ix_incident_incident_events_incident_id'), table_name='incident_events', schema='incident')

    # Incidents Indices
    op.drop_index(op.f('ix_incident_incidents_assigned_to'), table_name='incidents', schema='incident')
    op.drop_index(op.f('ix_incident_incidents_jurisdiction'), table_name='incidents', schema='incident')
    op.drop_index(op.f('ix_incident_incidents_status'), table_name='incidents', schema='incident')
    op.drop_index(op.f('ix_incident_incidents_trip_id'), table_name='incidents', schema='incident')
    op.drop_index(op.f('ix_incident_incidents_user_id'), table_name='incidents', schema='incident')
    op.drop_index(op.f('ix_incident_incidents_sos_alert_id'), table_name='incidents', schema='incident')

    # SOS Alerts Indices
    op.drop_index(op.f('ix_sos_sos_alerts_status'), table_name='sos_alerts', schema='sos')
    op.drop_index(op.f('ix_sos_sos_alerts_incident_id'), table_name='sos_alerts', schema='sos')
    op.drop_index(op.f('ix_sos_sos_alerts_trip_id'), table_name='sos_alerts', schema='sos')
    op.drop_index(op.f('ix_sos_sos_alerts_user_id'), table_name='sos_alerts', schema='sos')
    op.drop_index(op.f('ix_sos_sos_alerts_client_sos_id'), table_name='sos_alerts', schema='sos')
