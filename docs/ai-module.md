# Module IA — Prompts, génération et fusion

## Références
- Description fonctionnelle et logique: `AI.md` (racine).
- Implémentation: `backend/ai/`.

## Services principaux
- `backend/ai/ai_resource_service.py`
  - `generate_ai_resource_content(type_key, subtype_key, input_variables)`
    - Appelle `genai.Client().models.generate_content()` (synchrone).
    - Paramètre de configuration: `config` (inclut `response_mime_type`, `response_schema`, etc.).
  - `merge_ai_resource_content(type_key, subtype_key, data_json, model_path, user_id)`
    - Fusionne JSON + template (Jinja) via le modèle IA pour produire HTML.

## Prompts et templates
- `backend/ai/prompts/config/prompts/*.yaml` — YAML de prompts
  - `system_prompt`, `user_prompt_template`, `parameters`, `constraints`, `response_schema` (optionnel).
- `PromptGenerator` charge YAML + templates Jinja.
- `PROMPT_REGISTRY` dans `ai_resource_service.py` mappe `(type, subtype)` → fichier YAML.

## Flux frontend (wizard)
1. Sélection des suggestions (`SuggestionStep.jsx`).
2. Génération (`GenerationStep.jsx`) via API IA.
3. Édition (`EditStep.jsx` + `ResourceEditorForm.js`).
4. Fusion (`MergeStep.jsx`) → `/ai/merge-resource` → HTML temporaire dans `static/generated_resources/tmp/{user_id}`.

## Performance
- Les appels `generate_content()` sont synchrones. La fonction Python appelante peut être `async` → envelopper via `fastapi.concurrency.run_in_threadpool` pour éviter de bloquer l'event loop (optimisation future).

## Bonnes pratiques
- Définir un `response_schema` (JSON Schema) pour des sorties structurées.
- Tronquer/segmenter les contenus volumineux dans le contexte si nécessaire.
