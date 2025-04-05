"""add_user_relationships

Revision ID: 2e379c582849
Revises: db8f3b828e80
Create Date: 2025-04-03 23:52:21.078645

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2e379c582849'
down_revision: Union[str, None] = 'db8f3b828e80'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
