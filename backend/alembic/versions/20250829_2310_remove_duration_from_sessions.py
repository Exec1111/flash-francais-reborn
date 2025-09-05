"""Remove duration column from sessions table

Revision ID: 20250829_2310_remove_duration_from_sessions
Revises: c684c7dc89f4
Create Date: 2025-08-29 23:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250829_2310_remove_duration_from_sessions'
down_revision = 'c684c7dc89f4'
branch_labels = None
depends_on = None


def upgrade():
    # Remove the duration column from sessions table
    op.drop_column('sessions', 'duration')


def downgrade():
    # Add back the duration column in case of rollback
    op.add_column('sessions', sa.Column('duration', sa.INTEGER(), nullable=True))
