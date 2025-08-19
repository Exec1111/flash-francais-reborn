"""add docling cache fields to resources

Revision ID: add_docling_fields_to_resources
Revises: add_fiche_resource_to_session
Create Date: 2025-07-03 10:15:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_docling_fields_to_resources'
down_revision = 'add_fiche_resource_to_session'
branch_labels = None
depends_on = None


def upgrade():
    # Docling cache metadata columns
    op.add_column('resources', sa.Column('docling_status', sa.String(length=20), nullable=True))
    op.add_column('resources', sa.Column('docling_md_path', sa.String(), nullable=True))
    op.add_column('resources', sa.Column('docling_tables_path', sa.String(), nullable=True))
    op.add_column('resources', sa.Column('docling_chars', sa.Integer(), nullable=True))
    op.add_column('resources', sa.Column('docling_sha256', sa.String(length=64), nullable=True))
    op.add_column('resources', sa.Column('docling_version', sa.String(length=50), nullable=True))
    op.add_column('resources', sa.Column('ocr_used', sa.Boolean(), nullable=True))
    op.add_column('resources', sa.Column('extracted_at', sa.DateTime(), nullable=True))
    op.add_column('resources', sa.Column('docling_error', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('resources', 'docling_error')
    op.drop_column('resources', 'extracted_at')
    op.drop_column('resources', 'ocr_used')
    op.drop_column('resources', 'docling_version')
    op.drop_column('resources', 'docling_sha256')
    op.drop_column('resources', 'docling_chars')
    op.drop_column('resources', 'docling_tables_path')
    op.drop_column('resources', 'docling_md_path')
    op.drop_column('resources', 'docling_status')
