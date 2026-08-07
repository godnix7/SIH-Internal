"""create faqs table

Revision ID: f601b74b2eac
Revises: f601b74b2eab
Create Date: 2026-08-07 10:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f601b74b2eac'
down_revision: Union[str, None] = 'c9ac6a651f7c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'faqs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('answer', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_faqs_category'), 'faqs', ['category'], unique=False)
    op.create_index(op.f('ix_faqs_id'), 'faqs', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_faqs_id'), table_name='faqs')
    op.drop_index(op.f('ix_faqs_category'), table_name='faqs')
    op.drop_table('faqs')
