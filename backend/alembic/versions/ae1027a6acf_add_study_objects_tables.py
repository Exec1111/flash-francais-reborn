"""
Revision ID: ae1027a6acf
Revises: 74fb8bb693af
Create Date: 2025-04-19 17:29:48.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'ae1027a6acf'
down_revision = '74fb8bb693af'
branch_labels = None
depends_on = None


def upgrade():
    # Table des objets d'étude
    op.create_table(
        'study_objects',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    )
    # Table d'association progression <> study_object
    op.create_table(
        'progression_study_object',
        sa.Column('progression_id', sa.Integer(), sa.ForeignKey('progressions.id', ondelete='CASCADE'), primary_key=True, nullable=False),
        sa.Column('study_object_id', sa.Integer(), sa.ForeignKey('study_objects.id', ondelete='CASCADE'), primary_key=True, nullable=False),
    )
    # Table d'association study_object <> resource
    op.create_table(
        'study_object_resource',
        sa.Column('study_object_id', sa.Integer(), sa.ForeignKey('study_objects.id', ondelete='CASCADE'), primary_key=True, nullable=False),
        sa.Column('resource_id', sa.Integer(), sa.ForeignKey('resources.id', ondelete='CASCADE'), primary_key=True, nullable=False),
    )


def downgrade():
    op.drop_table('study_object_resource')
    op.drop_table('progression_study_object')
    op.drop_table('study_objects')
