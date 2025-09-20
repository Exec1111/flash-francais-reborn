"""
add template_key and template_version to resources

Revision ID: 20250919_1620
Revises: 20250919_1500
Create Date: 2025-09-19 16:20:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250919_1620'
down_revision = '20250919_1500'
branch_labels = None
depends_on = None

def upgrade() -> None:
    with op.batch_alter_table('resources') as batch_op:
        batch_op.add_column(sa.Column('template_key', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('template_version', sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('resources') as batch_op:
        batch_op.drop_column('template_version')
        batch_op.drop_column('template_key')
