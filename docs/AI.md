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

## 11. Unification des templates d’activités

Pour garantir un rendu visuel identique entre la version générée par l’IA et la version post-édition, un système d’unification avec résolution automatique des chemins a été mis en place.

### 11.1. Architecture unifiée

- Les artefacts persistés par ressource sont désormais:
  - `data_json` (canonique, ex: QCM)
  - `runtime_html_path` (HTML autonome pour l'activité)
  - `template_key` et `template_version` (clé/version du template utilisé)

- **Résolution automatique des chemins** via `TemplateResolver`:
  - Template de base: `backend/ai/template/default_{type}_{subtype}.html`
  - Template runtime: `backend/ai/template_runtime/{subtype}_runtime_template.html`
  - Clé de template: `{type}_{subtype}_v{version}`

- Le contenu est injecté dynamiquement depuis `data_json` via le placeholder `<!--ACTIVITY_DATA_JSON-->`.

- **Exercices dynamiques** : QCM, Champlex (génération de runtime HTML interactive)
- **Exercices statiques** : Analyse de texte, Dictée (contenu fixe, pas de runtime dynamique)

- À chaque sauvegarde de ressource d'activité (`PUT /api/v1/resources/{id}`) :
  - Le HTML édité est parsé en JSON (ex: `html_to_qcm_json()` ou `html_to_champlex_json()`).
  - `TemplateResolver.resolve_templates(type, subtype)` détermine automatiquement les chemins et la clé.
  - Si `template_key` est absent, il est fixé selon la résolution (ex: `exercice_qcm_v1`) et persisté.
  - Le `runtime_html_path` est (re)généré à partir du template runtime résolu.

- Lecture (`GET /api/v1/resources/{id}`) :
  - Expose `runtime_html_url` construit depuis `runtime_html_path` et `MEDIA_URL_PREFIX`.
  - Si possible, conservez les deux: `runtime_html_url` (URL directement ouvrable) et `runtime_html_path` (chemin relatif persistant dans le stockage).

- Frontend:
  - Dans `ResourceView`, le bouton "Lancer l'activité" ouvre directement `runtime_html_url` si présent (sinon rafraîchit la ressource, puis fallback vers la page interne, cf. logique locale).

### 11.1. Champs et modèles

- Modèle `Resource`:
  - `data_json: JSON`
  - `runtime_html_path: String`
  - `template_key: String`
  - `template_version: Integer`

- Schémas Pydantic (`schemas/resource.py`):
  - `ResourceResponse` expose `data_json`, `runtime_html_url`, `template_key`, `template_version`.
  - `ResourceUpdate` accepte `runtime_html_path`, `template_key`, `template_version` (renseignés côté serveur lors des sauvegardes QCM).

### 11.2. Structure des dossiers

```bash
backend/ai/
├── template/                    # Templates de base (génération IA + édition)
│   ├── default_exercice_qcm.html
│   ├── default_exercice_analysetexte.html  # ← Statique, pas de runtime
│   ├── default_exercice_dictee.html
│   └── ...
├── template_runtime/            # Templates runtime (activités autonomes)
│   ├── qcm_runtime_template.html
│   ├── dictee_runtime_template.html
│   └── ...
└── services/
    └── template_resolver.py     # Résolution automatique des chemins
```

### 11.3. Types d'exercices

| Type | Sous-type | Template Base | Template Runtime | Statut |
|------|-----------|---------------|------------------|--------|
| `exercice` | `qcm` | ✅ `default_exercice_qcm.html` | ✅ `qcm_runtime_template.html` | **Dynamique** |
| `exercice` | `champlex` | ✅ `default_exercice_champlex.html` | ✅ `champlex_runtime_template.html` | **Dynamique** |
| `exercice` | `analysetexte` | ✅ `default_exercice_analysetexte.html` | ❌ | **Statique** |
| `exercice` | `dictee` | ✅ `default_exercice_dictee.html` | ❌ | **Statique** |

> Note: `champlex2` (nouvelle version) suit la même logique que `champlex` côté runtime (Dynamique).

### 11.4. Migrations Alembic

Exécuter dans l'ordre (si besoin) :

- `20250919_1415_add_data_json_to_resources.py` (colonne `data_json`)
- `20250919_1500_add_runtime_html_path_to_resources.py` (colonne `runtime_html_path`)
- `20250919_1620_add_template_fields_to_resources.py` (colonnes `template_key`, `template_version`)

Commandes:

```bash
alembic upgrade head
```

Sur Render, s'assurer que la commande de release/exécution des migrations est lancée avant le démarrage (voir `render.yaml`).

### 11.5. Guide de conversion

Pour ajouter un nouveau type d'activité runtime, voir le guide détaillé : `docs/templates-runtime.md`

### 11.6. Endpoint runtime (lecture JSON canonique)

- `GET /api/v1/ai/runtime/qcm/{resource_id}`: renvoie `{ id, title, data_json }` pour dépannage et usages internes.
- Le runtime HTML public se trouve via `runtime_html_url` sur la ressource (`GET /api/v1/resources/{id}`).

---

## 12. Frontend: ouverture des contenus et compatibilité

### 12.1. Ouverture depuis la page d'édition (`ResourceForm`)

Le bouton "Lancer l'activité" suit l'ordre de priorité suivant (cf. `frontend/src/components/resources/ResourceForm.js`, fonction `handleLaunchActivity`) :

1. `runtime_html_url` (prioritaire) → ouvre directement (avec cache-buster).
2. `runtime_html_path` → reconstruit l'URL publique depuis `API_BASE_URL` + `/media/uploads/`.
3. `html_url` / `html_content_url` → ouvre l'URL telle quelle (avec `API_BASE_URL` si relative).
4. `file_path` / `url` se terminant par `.html` → ouvre l'HTML.
5. Dernier recours → ouvre `/resources/view/{id}` (page de consultation) qui essaie aussi de lancer l'activité.

La détection d'activité dynamique côté édition (`isDynamicActivity`) considère la ressource dynamique si l'un des critères est vrai:

- Présence de `runtime_html_path` ou de `runtime_html_url`.
- Présence de `data_json`.
- Sous-type dans `{champlex, champlex2, qcm, pendu}`.
- Type `exercice` même si le sous-type n'est pas encore chargé.

### 12.2. Ouverture depuis la liste des ressources (`ResourceActionLink`)

Le lien "Document" de la DataGrid bascule automatiquement entre:

- "🚀 Lancer l'activité" pour les ressources dynamiques (même ordre de résolution que ci-dessus, via `runtime_html_url` puis `runtime_html_path`, etc.).
- "🔗 Ouvrir le document" pour les contenus statiques (`file_path`).
- "Activité non disponible." si aucun lien valable n'est trouvable (rare; à traiter en migration, voir ci-dessous).

### 12.3. Critères de compatibilité (dynamique/statique)

Une ressource est considérée comme pleinement compatible avec le nouveau système si au moins un de ces champs est renseigné (dans `GET /api/v1/resources/{id}`):

- `runtime_html_url` (recommandé)
- `runtime_html_path` (et que le fichier existe dans `static/media/uploads/`)
- `html_url` ou `html_content_url` (ouvre un HTML autonome valide)
- `file_path` se terminant par `.html`

Sinon, le frontend affichera "Activité non disponible." dans la liste, et le bouton d'édition utilisera le fallback vers la page de consultation.

### 12.4. Check-list de migration (manuel, ressource par ressource)

Pour mettre vos ressources à niveau, suivez cette procédure pour chaque ressource `exercice`:

1. Ouvrir la ressource en édition (`/resources/edit/{id}`).
2. Cliquer sur "Éditer le contenu" si c'est une activité dynamique (ex: `champlex2`).
3. Modifier/sauvegarder. À la sauvegarde, le backend doit écrire ou réécrire `runtime_html_path` (et idéalement `runtime_html_url`).
4. Tester "Lancer l'activité" depuis l'édition.
5. Vérifier dans la liste que "Lancer l'activité" apparaît.

Si "Activité non disponible." persiste:

- Vérifier la réponse JSON de `GET /api/v1/resources/{id}` et confirmer la présence d'au moins un champ parmi `runtime_html_url`, `runtime_html_path`, `html_url`, `html_content_url`, ou `.html` dans `file_path`/`url`.
- Si `runtime_html_path` est présent mais que l'URL publique ne fonctionne pas, vérifiez que `API_BASE_URL` et l'exposition de `/media/uploads/` côté serveur sont corrects (Render).
- Le cas échéant, ajouter la construction de `runtime_html_url` côté backend (cf. §11.1) pour fiabiliser.

### 12.5. Script/API d'audit (suggestion)

Exposez un endpoint d'audit (ou utilisez un script d'admin) qui liste les ressources `exercice` sans aucun des champs attendus ci-dessus. Exemple d'algorithme:

- Filtrer `Resource` où `type.key = 'exercice'`.
- Garder celles pour lesquelles tous les champs suivants sont vides: `runtime_html_url`, `runtime_html_path`, `html_url`, `html_content_url`, et qui n'ont pas `.html` dans `file_path`/`url`.
- Retourner `{id, title, type, subtype}` pour traitement.

Ces ressources seront marquées comme "non compatibles" et à migrer en priorité.


### 11.7. Résolution automatique (TemplateResolver)

```python
from ai.services.template_resolver import TemplateResolver

# Résolution automatique pour un QCM
base_path, runtime_path, template_key = TemplateResolver.resolve_templates('exercice', 'qcm')
# base_path: backend/ai/template/default_exercice_qcm.html
# runtime_path: backend/ai/template_runtime/qcm_runtime_template.html  
# template_key: exercice_qcm_v1
```

---

*Fin de la documentation AI*
