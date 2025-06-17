"""add bilan_resource_id to sequences

Revision ID: d3b2d4b6c8a4
Revises: c55e4e32868a
Create Date: 2025-06-12 15:18:00
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd3b2d4b6c8a4'
down_revision = 'c55e4e32868a'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('sequences', sa.Column('bilan_resource_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_sequences_bilan_resource', 'sequences', 'resources', ['bilan_resource_id'], ['id'])


def downgrade():
    op.drop_constraint('fk_sequences_bilan_resource', 'sequences', type_='foreignkey')
    op.drop_column('sequences', 'bilan_resource_id')
