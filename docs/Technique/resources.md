# Ressources — Modèle, associations et stockage

## Modèle `Resource`
- Fichier: `backend/models/resource.py`
- Champs principaux: `title`, `description`, `type_id`, `sub_type_id`, `user_id`, `source_type`, `file_path`, `file_type`, etc.
- Métadonnées Docling: voir `docs/docling.md`.

## Types et sous-types
- Modèles: `ResourceType`, `ResourceSubType`.
- Clés: `type.key` (ex: `pdf`, `text`, `image`…), `sub_type.key`.

## Associations
- Sessions: `resources` via table d’association.
- Objectifs: `objectives` via table d’association.
- Objets d’étude: `study_objects` via table d’association.

## Stockage fichiers
- Base disque: `settings.UPLOADS_BASE_DIR` (voir `backend/config.py`).
- Chemins relatifs en BDD: `uploads/{user_id}/...`.
- IA (HTML généré) copié sous `UPLOADS_BASE_DIR` et référencé par `file_path`.

## Bonnes pratiques
- Toujours stocker en BDD un chemin relatif (portabilité Render/local).
- Ne pas auto-supprimer des fichiers sans coordination CRUD.
