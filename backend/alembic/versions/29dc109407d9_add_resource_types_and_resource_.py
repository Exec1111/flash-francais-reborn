"""Add resource_types and resource_subtypes tables

Revision ID: 29dc109407d9
Revises: 2e379c582849
Create Date: 2025-04-04 16:03:07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '29dc109407d9'
down_revision: Union[str, None] = '2e379c582849'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Supprimer la colonne type existante
    op.drop_column('resources', 'type')
    
    # Créer la table des types de ressources
    op.create_table(
        'resource_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=50), nullable=False),
        sa.Column('value', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP'),
                  server_onupdate=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key')
    )

    # Créer la table des sous-types de ressources
    op.create_table(
        'resource_subtypes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('type_id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=50), nullable=False),
        sa.Column('value', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP'),
                  server_onupdate=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['type_id'], ['resource_types.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key', 'type_id', name='uq_resource_subtypes_key_type_id')
    )

    # Modifier la table resources pour ajouter les clés étrangères
    with op.batch_alter_table('resources') as batch_op:
        batch_op.add_column(sa.Column('type_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('sub_type_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_resources_type_id', 'resource_types', ['type_id'], ['id'])
        batch_op.create_foreign_key('fk_resources_sub_type_id', 'resource_subtypes', ['sub_type_id'], ['id'])

    # Ajouter un index sur type_id et sub_type_id pour optimiser les requêtes
    op.create_index('ix_resources_type_id', 'resources', ['type_id'], unique=False)
    op.create_index('ix_resources_sub_type_id', 'resources', ['sub_type_id'], unique=False)

    # Ajouter les types et sous-types par défaut
    op.execute("""
        INSERT INTO resource_types (key, value) VALUES
        ('EXERCICE', 'Exercice'),
        ('MULTIMEDIA', 'Multimédia'),
        ('LECON', 'Leçon'),
        ('OEUVRE', 'Oeuvre')
    """)

    op.execute("""
        INSERT INTO resource_subtypes (type_id, key, value) VALUES
        -- Sous-types pour EXERCICE
        ((SELECT id FROM resource_types WHERE key = 'EXERCICE'), 'QCM', 'QCM'),
        ((SELECT id FROM resource_types WHERE key = 'EXERCICE'), 'DICTEE', 'DICTEE'),
        ((SELECT id FROM resource_types WHERE key = 'EXERCICE'), 'QOEUVRE', 'Questions sur une oeuvre'),
        ((SELECT id FROM resource_types WHERE key = 'EXERCICE'), 'QTEXTE', 'Questions sur un texte'),
        
        -- Sous-types pour LECON
        ((SELECT id FROM resource_types WHERE key = 'LECON'), 'FORMAT1', 'Format court'),
        ((SELECT id FROM resource_types WHERE key = 'LECON'), 'FORMAT2', 'Format long'),
        
        -- Sous-types pour OEUVRE
        ((SELECT id FROM resource_types WHERE key = 'OEUVRE'), 'TEXTE', 'Extrait de texte'),
        ((SELECT id FROM resource_types WHERE key = 'OEUVRE'), 'OEUVRE', 'Oeuvre complète')
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Supprimer les colonnes et les clés étrangères
    op.drop_constraint('fk_resources_type_id', 'resources', type_='foreignkey')
    op.drop_constraint('fk_resources_sub_type_id', 'resources', type_='foreignkey')
    op.drop_column('resources', 'type_id')
    op.drop_column('resources', 'sub_type_id')

    # Supprimer les tables
    op.drop_table('resource_subtypes')
    op.drop_table('resource_types')

    # Recréer la colonne type
    op.add_column('resources', sa.Column('type', sa.JSON(), nullable=True))
