# Docling — Extraction PDF → Markdown + tables

## Objet
Extraire le texte (Markdown) et tables (HTML) d’un PDF uploadé, puis stocker les chemins et métadonnées sur la ressource.

## Champs (modèle `Resource`)
- `docling_status`: `pending` | `processing` | `ready` | `error` (ou vide)
- `docling_md_path`, `docling_tables_path`, `docling_chars`
- `docling_sha256`, `docling_version`, `ocr_used`, `extracted_at`, `docling_error`
- Code: `backend/models/resource.py`

## Cycle de vie
1. Création ressource PDF (`POST /resources/`)
   - `docling_status = "pending"` avant planification.
   - Code: `backend/routers/resource.py` (~240–249).
2. Tâche de fond démarre
   - `docling_status = "processing"`.
   - Code: `backend/ai/services/docling_background.py` (~48–54).
3. Extraction et écriture
   - Fichiers: `uploads/{user_id}/docling/resource_{id}.md` et `..._tables.html`.
   - Code: `docling_background.py` (~136–158).
4. Succès
   - `docling_status = "ready"`, champs métadonnées remplis.
5. Échec
   - `docling_status = "error"`, message dans `docling_error`.

## Réutilisation par cache SHA-256
- Si un PDF (même user) possède le même `docling_sha256` en `ready` et même `ocr_used`, on recopie les sorties sans ré-extraction.
- Code: `docling_background.py` (~68–127).

## Endpoints utiles
- `POST /docling/extract` — extraction ponctuelle (depuis `resource_id` ou upload direct).
- Extraction background: planifiée depuis `POST /resources/`.

## Intégration dans la génération IA
- Le prompt de suggestion d’exercices utilise prioritairement le Markdown Docling comme support s’il est `ready`. Des fallbacks existent si le Markdown manque (lecture directe, tables, etc.).
