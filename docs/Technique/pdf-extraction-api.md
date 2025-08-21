# API Extraction PDF (Statut et Ré-extraction)

Cette documentation décrit les endpoints backend utilisés pour le statut et la ré-extraction du contenu PDF (Markdown + tables) depuis une ressource. Ils sont alignés avec le frontend (React) actuel.

- Préfixe API global: `/api/v1`
- Préfixe des ressources: `/resources`
- Authentification: JWT requis via `Authorization: Bearer <token>`
- Compatibilité Render: ces routes fonctionnent aussi en déploiement Render (voir `render.yaml`).

## Endpoints

- `GET /api/v1/resources/{resource_id}/docling`
  - Récupère le statut d'extraction PDF pour une ressource et, si prêt, le contenu extrait (markdown + tables).
  - Réponse: `DoclingStatusResponse`

- `POST /api/v1/resources/{resource_id}/reextract`
  - Planifie une nouvelle extraction PDF en tâche de fond (même ressource).
  - Body: `multipart/form-data` avec champs:
    - `ocr`: booléen (optionnel, défaut `false`). Actuellement ignoré par l'implémentation PyMuPDF (pas d'OCR réel), mais enregistré dans les métadonnées et utilisé pour la déduplication.
    - `force`: booléen (optionnel, défaut `false`). Si `false` et qu'une extraction est déjà en cours (`pending` ou `processing`), l'API retourne simplement le statut courant sans relancer.
  - Réponse: `DoclingStatusResponse` (typiquement `{"status":"pending"}` après planification).

## Modèle de réponse: DoclingStatusResponse

```json
{
  "status": "pending | processing | ready | error",
  "ocr_used": true,
  "docling_version": "...",
  "extracted_at": "2025-01-01T12:00:00Z",
  "docling_error": "message si error",
  "docling_chars": 12345,
  "document_markdown": "... (présent si status=ready)",
  "tables": [
    { "index": 1, "html": "<table>...</table>" }
  ]
}
```

- `document_markdown` et `tables` ne sont fournis que quand `status = ready`.
- `docling_error` décrit l'erreur si `status = error`.

## Comportement et logique

- L'extraction est effectuée en tâche de fond par `run_docling_extraction(resource_id, user_id, ocr)`.
- L'implémentation actuelle utilise PyMuPDF (extraction du texte embarqué) et ne supporte pas l'OCR réel. Lorsque `ocr = true` est fourni:
  - Le backend loggue un avertissement et continue sans OCR.
  - La valeur est conservée dans la BDD (`ocr_used`) et entre dans la clé de déduplication.
- Déduplication: si un PDF identique (même `sha256`) a déjà été extrait pour le même utilisateur avec le même `ocr_used` et `status=ready`, le backend réutilise les fichiers générés et marque la ressource comme `ready` rapidement (copie des sorties).
- Transitions d'état typiques:
  - `pending` -> `processing` -> `ready` (ou `error` en cas d'échec).

## Exemples

### Récupérer le statut

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "$API_BASE_URL/api/v1/resources/123/docling"
```

### Relancer l'extraction (sans OCR, non forcée)

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -F ocr=false -F force=false \
  "$API_BASE_URL/api/v1/resources/123/reextract"
```

### Relancer l'extraction (forcer)

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -F ocr=false -F force=true \
  "$API_BASE_URL/api/v1/resources/123/reextract"
```

## Intégration frontend

- Service: `frontend/src/services/resourceService.js`
  - `getPdfExtractionStatus(id)` -> `GET /resources/{id}/docling`
  - `reextractPdfExtraction(id, { ocr, force })` -> `POST /resources/{id}/reextract` (FormData)
- Page: `frontend/src/pages/ResourceView.js`
  - Polling toutes les 2.5s jusqu'à `ready` ou `error`.
  - Affiche le markdown extrait et les tables si disponibles.
  - Le champ d'erreur lu est `docling_error`.

## Limitations actuelles

- OCR: non supporté par l'extracteur basé sur PyMuPDF. Le paramètre `ocr` est conservé à titre informatif/compatibilité et pour la déduplication.
- Extraction de tables: non implémentée (liste vide renvoyée).

## Bonnes pratiques Render

- Configurer `REACT_APP_API_BASE_URL` côté frontend et les variables d'environnement backend (dont `UPLOADS_BASE_DIR`).
- Vérifier que les fichiers générés sont servis correctement via le serveur (voir `app.py` et configuration statique `/media/uploads`).
