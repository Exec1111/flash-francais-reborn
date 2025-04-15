"""add order column to sequences

Revision ID: 9aebf6672da0
Revises: a76c98a1a4ff
Create Date: 2025-04-15 16:40:57.967084

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9aebf6672da0'
down_revision: Union[str, None] = 'a76c98a1a4ff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('sequences', sa.Column('order', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('sequences', 'order')
