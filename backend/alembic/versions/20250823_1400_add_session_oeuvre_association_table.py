"""add session_oeuvre_association_table

Revision ID: 20250823_1400
Revises: 2e492770c848
Create Date: 2025-08-23 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250823_1400'
down_revision = '2e492770c848'
branch_labels = None
depends_on = None


def upgrade():
    # Create session_oeuvre_association table
    op.create_table('session_oeuvre_association',
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('oeuvre_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['oeuvre_id'], ['oeuvres.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('session_id', 'oeuvre_id')
    )


def downgrade():
    # Drop session_oeuvre_association table
    op.drop_table('session_oeuvre_association')