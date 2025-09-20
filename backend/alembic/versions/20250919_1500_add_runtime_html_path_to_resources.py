"""
add runtime_html_path to resources

Revision ID: 20250919_1500
Revises: 20250919_1415
Create Date: 2025-09-19 15:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250919_1500'
down_revision = '20250919_1415'
branch_labels = None
depends_on = None

def upgrade() -> None:
    with op.batch_alter_table('resources') as batch_op:
        batch_op.add_column(sa.Column('runtime_html_path', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('resources') as batch_op:
        batch_op.drop_column('runtime_html_path')
