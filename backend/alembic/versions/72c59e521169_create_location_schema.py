"""create_location_schema

Revision ID: 72c59e521169
Revises: b468f3872643
Create Date: 2026-07-15 09:02:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

# revision identifiers, used by Alembic.
revision = '72c59e521169'
down_revision = 'b468f3872643'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create schema
    op.execute("CREATE SCHEMA IF NOT EXISTS location")

    # Create location_points partitioned table
    op.execute("""
        CREATE TABLE location.location_points (
            id              UUID NOT NULL DEFAULT gen_random_uuid(),
            trip_id         UUID NOT NULL,
            user_id         UUID NOT NULL,
            point           GEOMETRY(Point, 4326) NOT NULL,
            accuracy_m      REAL NOT NULL,
            altitude_m      REAL,
            speed_mps       REAL,
            heading         REAL,
            battery_pct     SMALLINT,
            network_type    TEXT,
            source          TEXT NOT NULL DEFAULT 'gps' CHECK (source IN ('gps','network','fused','sls','manual')),
            sampled_at      TIMESTAMPTZ NOT NULL,
            received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
            batch_id        UUID NOT NULL,
            PRIMARY KEY (id, sampled_at)
        ) PARTITION BY RANGE (sampled_at);
    """)

    # Create initial partitions (for July, August, September 2026)
    op.execute("""
        CREATE TABLE location.location_points_2026_07 PARTITION OF location.location_points
        FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
    """)
    op.execute("""
        CREATE TABLE location.location_points_2026_08 PARTITION OF location.location_points
        FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
    """)
    op.execute("""
        CREATE TABLE location.location_points_2026_09 PARTITION OF location.location_points
        FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
    """)

    # Create indexes
    op.execute("CREATE INDEX idx_loc_sampled_brin ON location.location_points USING BRIN (sampled_at);")
    op.execute("CREATE INDEX idx_loc_trip ON location.location_points (trip_id, sampled_at DESC);")
    op.execute("CREATE INDEX idx_loc_point ON location.location_points USING GIST (point);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS location.location_points CASCADE")
    op.execute("DROP SCHEMA IF EXISTS location CASCADE")
