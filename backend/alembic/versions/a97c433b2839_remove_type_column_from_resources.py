"""remove_type_column_from_resources

Revision ID: a97c433b2839
Revises: 29dc109407d9
Create Date: 2025-04-04 17:07:40.326032

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a97c433b2839'
down_revision: Union[str, None] = '29dc109407d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
