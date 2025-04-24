# Module de génération de ressources IA

Ce document décrit le fonctionnement technique du module générique de génération de ressources par IA dans ce projet.

---

## 1. Architecture

Le module se compose principalement de deux fonctions asynchrones dans `backend/ai/ai_resource_service.py` :

- `generate_ai_resource_content(type_key, subtype_key, input_variables)` :
  1. Récupère le nom de prompt via `PROMPT_REGISTRY` et charge la config YAML correspondante.
  2. Génère le prompt système (`system_prompt`) et le prompt utilisateur (`user_prompt`) via la classe `PromptGenerator`.
  3. Charge les variables d’environnement (`GOOGLE_API_KEY`, `GEMINI_CHAT_MODEL`).
  4. Instancie le client Google GenAI (`genai.Client`).
  5. Concatène system + user en une seule chaîne et passe en `contents=[ [uploaded_file?, prompt_text] ]` pour la fusion ou `contents=[{"role":"user","parts":[{"text": prompt_text}]}]` pour la génération de contenu.
  6. Construit dynamiquement `GenerateContentConfig` avec `response_mime_type="application/json"` et, si défini dans YAML, un schéma JSON (`response_schema`) nettoyé et aplati pour le SDK.
  7. Appelle `client.models.generate_content(...)` pour obtenir `response.text`.
  8. Parse le JSON brut (`json.loads`) et valide localement (`generator.validate`) sans bloquer en cas d’erreur.
  9. Retourne le dictionnaire Python.

- `merge_ai_resource_content(type_key, subtype_key, data_json, model_path, user_id)` :
  1. Charge les mêmes variables d’environnement.
  2. Upload du template HTML (ou fichier fourni) via `client.files.upload(...)`.
  3. Construit un prompt décrivant l’utilisation du template et des données JSON de l’utilisateur.
  4. Passe `contents=[ [uploaded_file, prompt_text] ]` à `generate_content` pour produire le HTML fusionné.
  5. Écrit le contenu HTML dans un fichier temporaire sous `static/generated_resources/tmp/{user_id}` et renvoie `(chemin, URL)`.

---

## 2. PromptGenerator

- Lit les fichiers YAML (dans `backend/ai/prompts/config/prompts/*.yaml`).
- Définit : `system_prompt`, `user_prompt_template`, `parameters`, `constraints` et éventuellement `response_schema` (fichier JSON Schema dans `schemas/`).
- Méthode `build(**kwargs)` : rend le prompt Jinja avec les paramètres fournis.
- Méthode `validate(json_response)` : valide en local avec `jsonschema` contre `response_schema` sans bloquer.

---

## 3. Ajout d’un nouveau type de ressource

1. Créer un fichier YAML sous `backend/ai/prompts/config/prompts/{nom}.yaml`
2. Définir `system_prompt`, `user_prompt_template`, `parameters`, et `response_schema` si besoin.
3. (Facultatif) Ajouter un JSON Schema sous `schemas/{nom}.schema.json`.
4. Mettre à jour `PROMPT_REGISTRY` dans `ai_resource_service.py` :
   ```python
   PROMPT_REGISTRY[("type", "subtype")] = "{nom}"
   ```

---

## 4. Variables d’environnement

- `GOOGLE_API_KEY` : clé API Google GenAI.
- `GEMINI_CHAT_MODEL` : nom du modèle (par ex. `gemini-2.5-flash-preview-04-17`).

---

## 5. Logs et débogage

- **INFO** : étapes clés (initialisation, appel HTTP, réponse brute).
- **WARNING** : échecs de validation de schéma (non bloquant).
- **ERROR** : erreurs d’appel GenAI, parsing ou écriture de fichier.

---

## 6. Dépendances

- `google-genai` SDK
- `jsonschema` pour validation
- `jinja2`, `pyyaml` pour templates

---

*Fin de la documentation AI*
