"""remove_sub_type_column_from_resources

Revision ID: b77azery224
Revises: a97c433b2839
Create Date: 2025-04-04 17:30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b77azery224'
down_revision: Union[str, None] = 'a97c433b2839'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema."""
    # Supprimer la colonne sub_type de la table resources
    op.drop_column('resources', 'sub_type')

def downgrade() -> None:
    """Downgrade schema."""
    # Recréer la colonne sub_type si nécessaire
    op.add_column('resources', sa.Column('sub_type', sa.JSON(), nullable=True))
