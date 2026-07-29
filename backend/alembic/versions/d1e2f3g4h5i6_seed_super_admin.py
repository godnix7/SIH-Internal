"""seed super admin

Revision ID: d1e2f3g4h5i6
Revises: c1d2e3f4g5h6
Create Date: 2026-07-28 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session
import os
import bcrypt
import uuid
from datetime import datetime

# revision identifiers, used by Alembic.
revision: str = 'd1e2f3g4h5i6'
down_revision: Union[str, Sequence[str], None] = 'c1d2e3f4g5h6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    session = Session(bind=bind)

    password = os.environ.get('SUPER_ADMIN_PASSWORD') or os.environ.get('SEED_ADMIN_PASSWORD')
    email = os.environ.get('SUPER_ADMIN_EMAIL', 'admin@yatrishield.gov.in')
    
    if not password:
        # Fallback to prevent login lockout if env vars aren't set during migration run
        password = "YatriAdmin2026!"
    
    password = password.strip('"\'')
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    result = session.execute(
        sa.text("SELECT id FROM auth.internal_users WHERE email = :email"),
        {"email": email}
    ).fetchone()
    
    if result:
        session.execute(
            sa.text("UPDATE auth.internal_users SET password_hash = :hash WHERE email = :email"),
            {"hash": hashed, "email": email}
        )
    else:
        session.execute(
            sa.text("""
                INSERT INTO auth.internal_users 
                (id, email, password_hash, role, status, created_at, updated_at) 
                VALUES 
                (:id, :email, :hash, 'sys_admin', 'active', :now, :now)
            """),
            {
                "id": str(uuid.uuid4()),
                "email": email,
                "hash": hashed,
                "now": datetime.utcnow()
            }
        )
    session.commit()


def downgrade() -> None:
    bind = op.get_bind()
    session = Session(bind=bind)
    email = os.environ.get('SUPER_ADMIN_EMAIL', 'admin@yatrishield.gov.in')
    session.execute(
        sa.text("DELETE FROM auth.internal_users WHERE email = :email"),
        {"email": email}
    )
    session.commit()
