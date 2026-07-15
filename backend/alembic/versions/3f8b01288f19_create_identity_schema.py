"""create_identity_schema

Revision ID: 3f8b01288f19
Revises: 72c59e521169
Create Date: 2026-07-15 09:11:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '3f8b01288f19'
down_revision = '72c59e521169'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create schema
    op.execute("CREATE SCHEMA IF NOT EXISTS identity")

    # Create identity.identities
    op.create_table('identities',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('id_type', sa.String(), nullable=False),
        sa.Column('name_enc', postgresql.BYTEA(), nullable=False),
        sa.Column('name_verified', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('dob_enc', postgresql.BYTEA(), nullable=True),
        sa.Column('nationality', sa.String(), nullable=True),
        sa.Column('photo_url', sa.String(), nullable=True),
        sa.Column('passport_number_enc', postgresql.BYTEA(), nullable=True),
        sa.Column('credential_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('confidence', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['auth.users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
        schema='identity'
    )

    # Create identity.medical_cards
    op.create_table('medical_cards',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('blood_group', sa.String(), nullable=True),
        sa.Column('allergies_enc', postgresql.BYTEA(), nullable=True),
        sa.Column('medications_enc', postgresql.BYTEA(), nullable=True),
        sa.Column('conditions_enc', postgresql.BYTEA(), nullable=True),
        sa.Column('gp_contact_enc', postgresql.BYTEA(), nullable=True),
        sa.Column('insurer_enc', postgresql.BYTEA(), nullable=True),
        sa.Column('all_self_declared', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['auth.users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
        schema='identity'
    )

    # Create identity.emergency_contacts
    op.create_table('emergency_contacts',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name_enc', postgresql.BYTEA(), nullable=False),
        sa.Column('phone_enc', postgresql.BYTEA(), nullable=False),
        sa.Column('relationship', sa.String(), nullable=False),
        sa.Column('notify_trip', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('notify_sos', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('notify_daily_ok', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('ordinal', sa.SmallInteger(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['auth.users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        schema='identity'
    )
    op.create_index('idx_contacts_user', 'emergency_contacts', ['user_id'], unique=False, schema='identity')


def downgrade() -> None:
    op.drop_index('idx_contacts_user', table_name='emergency_contacts', schema='identity')
    op.drop_table('emergency_contacts', schema='identity')
    op.drop_table('medical_cards', schema='identity')
    op.drop_table('identities', schema='identity')
    op.execute("DROP SCHEMA IF EXISTS identity CASCADE")
