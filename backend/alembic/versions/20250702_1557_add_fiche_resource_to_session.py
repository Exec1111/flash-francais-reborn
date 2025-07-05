"""add fiche_resource_id to sessions\n\nRevision ID: add_fiche_resource_to_session\nRevises: <fill_previous_revision>\nCreate Date: 2025-07-02 15:57:00\n"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_fiche_resource_to_session'
down_revision = 'd3b2d4b6c8a4'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('sessions', sa.Column('fiche_resource_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_sessions_fiche_resource', 'sessions', 'resources', ['fiche_resource_id'], ['id'], ondelete='SET NULL')


def downgrade():
    op.drop_constraint('fk_sessions_fiche_resource', 'sessions', type_='foreignkey')
    op.drop_column('sessions', 'fiche_resource_id')
