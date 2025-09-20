"""
add data_json column to resources

Revision ID: 20250919_1415
Revises: d3b2d4b6c8a4_add_bilan_resource_to_sequences
Create Date: 2025-09-19 14:15:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250919_1415'
# Important: down_revision doit référencer l'ID de la dernière migration (head) et non le nom de fichier
# La chaîne attendue est l'identifiant exact défini dans le fichier précédent
down_revision = '20250829_remove_duration'
branch_labels = None
depends_on = None

def upgrade() -> None:
    with op.batch_alter_table('resources') as batch_op:
        batch_op.add_column(sa.Column('data_json', sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('resources') as batch_op:
        batch_op.drop_column('data_json')
