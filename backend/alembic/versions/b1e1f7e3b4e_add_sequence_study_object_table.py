"""
Migration Alembic : Ajout de la table d'association sequence_study_object
Permet d'associer des objets d'étude à une séquence (avec contrainte applicative côté backend).
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b1e1f7e3b4e'
down_revision = 'ae1027a6acf'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'sequence_study_object',
        sa.Column('sequence_id', sa.Integer(), sa.ForeignKey('sequences.id', ondelete='CASCADE'), primary_key=True, nullable=False),
        sa.Column('study_object_id', sa.Integer(), sa.ForeignKey('study_objects.id', ondelete='CASCADE'), primary_key=True, nullable=False),
    )

def downgrade():
    op.drop_table('sequence_study_object')
