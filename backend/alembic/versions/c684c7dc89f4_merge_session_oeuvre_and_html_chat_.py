"""merge session_oeuvre and html_chat branches

Revision ID: c684c7dc89f4
Revises: 20250823_1400, 20250826_1500
Create Date: 2025-08-28 16:09:33.418383

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c684c7dc89f4'
down_revision: Union[str, None] = ('20250823_1400', '20250826_1500')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
