"""upgrade_resources_ia

Revision ID: b6c5f8d9e0a1
Revises: a4480bszerr13
Create Date: 2025-04-07 16:00:32.942157

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b6c5f8d9e0a1'
down_revision: Union[str, None] = 'a4480bszerr13'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Appliquer les changements pour ajouter les champs de fichier et le type de source."""
    # Ajouter les nouvelles colonnes, initialement nullable pour permettre la mise à jour
    op.add_column('resources', sa.Column('source_type', sa.String(length=10), nullable=True, comment='Type de source: file ou ai'))
    op.add_column('resources', sa.Column('file_path', sa.String(), nullable=True, comment='Chemin du fichier uploadé'))
    op.add_column('resources', sa.Column('file_name', sa.String(), nullable=True, comment='Nom original du fichier uploadé'))
    op.add_column('resources', sa.Column('file_size', sa.Integer(), nullable=True, comment='Taille du fichier en octets'))
    op.add_column('resources', sa.Column('file_type', sa.String(), nullable=True, comment='Type MIME du fichier'))

    # Mettre à jour les lignes existantes pour définir source_type à 'ai' par défaut
    # (On suppose que les ressources existantes étaient générées par IA ou que leur contenu était dans 'content')
    op.execute("UPDATE resources SET source_type = 'ai' WHERE source_type IS NULL")

    # Rendre la colonne source_type non nullable après la mise à jour
    op.alter_column('resources', 'source_type',
                    existing_type=sa.String(length=10),
                    nullable=False)

    # Supprimer l'ancienne colonne 'content'
    op.drop_column('resources', 'content')


def downgrade() -> None:
    """Annuler les changements."""
    # Recréer la colonne 'content' (en supposant qu'elle était de type Text)
    op.add_column('resources', sa.Column('content', sa.Text(), nullable=True))

    # (Optionnel : Tenter de restaurer le contenu ? Probablement pas faisable facilement)
    # Ici, on pourrait essayer de copier des données depuis file_path si source_type == 'file',
    # mais c'est complexe et potentiellement source d'erreurs.
    # Pour la simplicité, on ne restaure pas le contenu lors du downgrade.

    # Supprimer les colonnes ajoutées
    op.drop_column('resources', 'file_type')
    op.drop_column('resources', 'file_size')
    op.drop_column('resources', 'file_name')
    op.drop_column('resources', 'file_path')
    op.drop_column('resources', 'source_type')
