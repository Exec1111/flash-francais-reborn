# Module de génération de ressources IA

Ce document décrit le fonctionnement technique du module générique de génération de ressources par IA dans ce projet et le processus d'automatisation de la fusion des ressources.

---

## 1. Architecture

Le module se compose principalement de deux fonctions asynchrones dans `backend/ai/ai_resource_service.py` :

- `generate_ai_resource_content(type_key, subtype_key, input_variables)` :
  1. Récupère le nom de prompt via `PROMPT_REGISTRY` et charge la config YAML correspondante.
  2. Génère le prompt système (`system_prompt`) et le prompt utilisateur (`user_prompt`) via la classe `PromptGenerator`.
  3. Charge les variables d’environnement (`GOOGLE_API_KEY`, `GEMINI_CHAT_MODEL`). La clé API est utilisée pour initialiser le client.
  4. Importe et instancie le client Google GenAI : `from google import genai`, puis `client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))`.
  4bis. Sélectionne dynamiquement le modèle Gemini (Flash/Pro) d’après `PROMPT_REGISTRY` si disponible (clé `gemini_model`). Les variables supportées sont `GEMINI_FLASH_CHAT_MODEL` et `GEMINI_PRO_CHAT_MODEL` avec repli sur `GEMINI_CHAT_MODEL`, puis `gemini-1.5-flash-latest`.
  5. Concatène system + user en une seule chaîne et passe en `contents=[{"role":"user","parts":[{"text": prompt_text}]}]` pour la génération de contenu.
  6. Construit dynamiquement la configuration de génération sous forme de dictionnaire: `config = {"response_mime_type": "application/json", "response_schema": <schéma nettoyé/aplati si disponible>}`. Le schéma est pré-traité via `clean_schema()` et `flatten_schema()` avant envoi.
  7. Appelle l'API de manière asynchrone : `response = await client.aio.models.generate_content(model=model_name, contents=..., config=config)` pour obtenir `response.text`.
  8. Parse le JSON brut (`json.loads`) et valide localement (`generator.validate`) sans bloquer en cas d’erreur.
  9. Retourne le dictionnaire Python.

- `merge_ai_resource_content(type_key, subtype_key, data_json, model_path, user_id)` :
  1. Charge les mêmes variables d’environnement.
  2. Upload du template HTML (ou fichier fourni) via `uploaded_html = client.files.upload(file=model_path)`.
  3. Construit un prompt décrivant l’utilisation du template et des données JSON de l’utilisateur.
  4. Prépare le payload `payload = [uploaded_html, prompt_text]` puis appelle l'API : `response = await client.aio.models.generate_content(model=model_name, contents=[payload])` pour produire le HTML fusionné.
  5. Écrit le contenu HTML dans un fichier temporaire sous `backend/static/tmp/{user_id}` et renvoie `(chemin, URL)`.

---

## 2. PromptGenerator

- Lit les fichiers YAML (dans `backend/ai/prompts/config/prompts/*.yaml`).
- Définit : `system_prompt`, `user_prompt_template`, `parameters`, `constraints` et éventuellement `response_schema` (fichier JSON Schema dans `schemas/`).
- Méthode `build(**kwargs)` : rend le prompt Jinja avec les paramètres fournis.
- Méthode `validate(json_response)` : valide en local avec `jsonschema` contre `response_schema` sans bloquer.
- Le template HTML avec lequel seront fusionnées les données produites par le LLM est stocké dans `backend/ai/template/`
---

## 3. Ajout d’un nouveau type de ressource

1. Créer un fichier YAML sous `backend/ai/prompts/config/prompts/{nom}.yaml`
2. Définir `system_prompt`, `user_prompt_template`, `parameters`, et `response_schema` si besoin.
3. (Facultatif) Ajouter un JSON Schema sous `schemas/{nom}.schema.json`.
4. Mettre à jour `PROMPT_REGISTRY` dans `backend/ai/services/registry.py` (source de vérité réexportée par `ai_resource_service.py`).
   - Format recommandé (uniforme) depuis la mise à jour: dictionnaire avec clé `"config"` et nom SANS extension (`.yaml` facultative mais déconseillée).
   - Exemple:
     ```python
     PROMPT_REGISTRY[("exercice", "qcm")] = {"config": "qcm"}
     # Ancien format accepté pour compat : PROMPT_REGISTRY[("exercice", "dictee")] = "dictee"
     ```
   - Exemple avec sélection de modèle Gemini (flash/pro):
     ```python
     PROMPT_REGISTRY[("exercice", "mots-croises")] = {"config": "mots_croises", "gemini_model": "pro"}
     # Si non spécifié, fallback sur le modèle Flash
     ```
5. (Facultatif) Associer un modèle HTML par défaut dans `TEMPLATE_REGISTRY` (même fichier `registry.py`) si la ressource nécessite une fusion HTML. Exemple:
   ```python
   TEMPLATE_REGISTRY[("exercice", "qcm")] = "default_exercice_qcm.html"
   ```

---

## 4. Variables d’environnement

- `GOOGLE_API_KEY` : clé API Google GenAI.
- `GEMINI_CHAT_MODEL` : nom du modèle par défaut (fallback).
- `GEMINI_FLASH_CHAT_MODEL` : modèle Gemini Flash (utilisé si `gemini_model="flash"` dans `PROMPT_REGISTRY`).
- `GEMINI_PRO_CHAT_MODEL` : modèle Gemini Pro (utilisé si `gemini_model="pro"` dans `PROMPT_REGISTRY`).
- `API_BASE_URL` : base URL publique (ex: `https://votre-service.onrender.com`) pour construire les liens vers `static/`.

---

## 5. Logs et débogage

- **INFO** : étapes clés (initialisation, appel HTTP, réponse brute).
- **WARNING** : échecs de validation de schéma (non bloquant).
- **ERROR** : erreurs d’appel GenAI, parsing ou écriture de fichier.

---

## 6. Dépendances

- `google-genai` SDK (remplace `google-generativeai`)
- `jsonschema` pour validation
- `jinja2`, `pyyaml` pour templates

---

## 7. Flux de génération de ressources dans l'interface

Le processus de génération et de fusion des ressources a été automatisé dans l'interface utilisateur via un assistant (wizard) comportant plusieurs étapes :

### Étape 1: Sélection des suggestions

- L'utilisateur choisit parmi les suggestions de ressources proposées en fonction du contexte de la séance.
- Chaque suggestion sélectionnée sera transformée en une ressource générée par l'IA.

### Étape 2: Génération des ressources

- Le système génère automatiquement le contenu des ressources sélectionnées via l'API Google GenAI.
- Une barre de progression indique l'avancement de la génération pour chaque ressource.
- En cas d'erreur, l'utilisateur peut relancer la génération d'une ressource spécifique.

### Étape 3: Édition des ressources

- L'utilisateur peut éditer manuellement les propriétés et le contenu de chaque ressource générée.
- Un formulaire dynamique est créé en fonction du schéma de données de chaque type de ressource.
- Les données sont validées pour garantir leur conformité avec le format attendu.

### Étape 4: Fusion des ressources

- **Processus automatisé** : Les ressources éditées sont automatiquement fusionnées avec leurs templates HTML.
- L'API `/ai/merge-resource` est appelée pour chaque ressource avec les données éditées.
- Chaque ressource fusionnée est marquée comme "conservée" par défaut, mais l'utilisateur peut déselectionner celles qu'il ne souhaite pas sauvegarder.
- L'utilisateur peut visualiser le document HTML généré dans un nouvel onglet.
- Un bouton permet de sauvegarder directement les ressources conservées sans passer par une étape supplémentaire.

### Sauvegarde des ressources

- Lors de la sauvegarde, seules les ressources marquées comme "conservées" sont envoyées vers l'API `/resources/`.
- Chaque ressource est créée individuellement avec toutes ses propriétés, y compris l'association avec la séance.
- Après la sauvegarde, la page de détails de la séance est automatiquement rafraîchie pour afficher les nouvelles ressources.

## 8. Implémentation Frontend

L'implémentation côté client est organisée en plusieurs composants React :

- `ResourceGenerationWizard.jsx` : Composant principal qui orchestre le flux de génération de ressources.
- `components/wizard/SuggestionStep.jsx` : Étape de sélection des suggestions.
- `components/wizard/GenerationStep.jsx` : Étape de génération des ressources.
- `components/wizard/EditStep.jsx` : Étape d'édition des ressources générées.
- `components/wizard/MergeStep.jsx` : Étape de fusion et de sauvegarde des ressources.
- `components/ResourceEditorForm.js` : Formulaire dynamique pour l'édition des propriétés des ressources.

L'automatisation de la fusion et de la sauvegarde simplifie considérablement le processus pour l'utilisateur final, réduisant le temps nécessaire pour générer des ressources pédagogiques de qualité.

---

## 9. Procédure complète d’ajout d’un nouveau type/sous-type de ressource IA (Checklist)

- __Créer le YAML de prompt__ dans `backend/ai/prompts/config/prompts/{nom}.yaml`.
  - Inclure `system_prompt`, `user_prompt_template`, `parameters` (avec `name`, `type`, `label`, `default/enum` si besoin).
  - Optionnel: référencer un `response_schema` (JSON Schema dans `backend/ai/prompts/config/schemas/`).
- __Optionnel: Créer/mettre à jour le JSON Schema__ sous `schemas/{nom}.schema.json` et s’assurer qu’il valide la sortie attendue.
- __Enregistrer le mapping dans `PROMPT_REGISTRY`__ (`backend/ai/services/registry.py`).
  - Recommandé: `PROMPT_REGISTRY[(type, subtype)] = {"config": "{nom}"}`.
  - Les clés `(type, subtype)` sont normalisées en minuscules et tolèrent `-`/`_` côté backend.
- __Associer un template HTML par défaut__ si fusion requise via `TEMPLATE_REGISTRY` (`registry.py`).
- __Tester côté API__:
  - Récupérer le schéma des variables: `GET /api/v1/ai/resource-types/{type}/{subtype}/schema`.
  - Générer le contenu: `POST /api/v1/ai/generate-resource` avec `{"type_key","subtype_key","variables"}`.
  - Fusionner le HTML: `POST /api/v1/ai/merge-resource` avec `type_key`, `subtype_key`, `data_json`, et éventuellement un fichier modèle.

Notes:
- `PromptGenerator` accepte un `prompt_config` avec ou sans extension `.yaml`. Préférez sans extension pour éviter les doublons.
- Le schéma est envoyé à Gemini via `config={"response_mime_type":"application/json","response_schema":<schéma_compat>}`; le même schéma sert à une validation locale post-réponse.
- Pour la fusion, le payload transmis est `[uploaded_html, prompt]`, puis `contents=[payload]`.

---

## 10. Compatibilité Render et URLs publiques

- __Chemin des HTML temporaires__: `backend/static/tmp/{user_id}/{uuid}.html`.
- __Base d’URL configurable__: définissez `API_BASE_URL` (ex: `https://votre-domaine.onrender.com`) pour générer des URLs publiques stables des HTML fusionnés.
- __Astuces__: vérifiez que le dossier `static/` est bien exposé par le serveur sur Render.

---

*Fin de la documentation AI*
