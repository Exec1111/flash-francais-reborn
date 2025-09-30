
### 8.3. Spécifique « Texte reconstitué » (textereconstitue)

- **Template runtime**: `backend/ai/template_runtime/textereconstitue_runtime_template.html`
  - Placeholder: `<!--TEXTERECONSTITUE_DATA_JSON-->`
  - Variable: `window.TEXTERECONSTITUE_DATA` (le runtime accepte `{ exercice: {...} }` ou `{ ... }`)
- **ContentMerger**: ajouter `textereconstitue` aux `json_first_types` et au remplacement du placeholder.
- **Création & Mise à jour (backend)**:
  - `resource_create_router.py`: inclure `textereconstitue` dans les listes JSON-first et injecter `<!--TEXTERECONSTITUE_DATA_JSON-->`.
  - `resource_update_router.py`:
    - Inclure `textereconstitue` dans la condition JSON-first lors de la réception de `data_json_text`.
    - Lors de la régénération du runtime, ajouter `injected = injected.replace('<!--TEXTERECONSTITUE_DATA_JSON-->', data_str)`.
    - Ne pas tenter de parser HTML→JSON pour `textereconstitue` (il reste JSON-first), garder HTML→JSON pour `qcm` et `champlex` seulement.
    - Éviter les import locaux `import json` qui masquent le module global; préférer `import json as _json` si nécessaire.
- **Frontend**:
  - `useSubmitLogic.js`: inclure `textereconstitue` aux listes JSON-first (contournement de merge + envoi `ai_content_json`).
  - `editors/index.js`: exporter `TextereconstitueEditor` et ajouter le mapping dans `getStructuredEditor()`.
  - `ResourceHtmlEditingMode.js`: rendre `TextereconstitueEditor` lorsque `subtypeKey === 'textereconstitue'`.

### 8.4. Compléments Backend (update_resource_route) — éviter les régressions

- **Import requis** dans `backend/routers/resource_update_router.py`:
  ```python
  from crud.resource import get_upload_path
  ```
- **Liste JSON-first (mise à jour)** dans la branche `data_json_text`:
  ```python
  if not (t_key == 'exercice' and st_key in ['qcm','champlex','champlex2','pendu','quisuisje','textereconstitue']):
      logger.warning("[JSON-FIRST] data_json ignoré …")
  else:
      # génération runtime + sauvegarde
  ```
- **Injection du placeholder spécifique** lors de la génération du runtime:
  ```python
  injected = injected.replace('<!--TEXTERECONSTITUE_DATA_JSON-->', data_str)
  ```
- **Garde-fou HTML→JSON** (ne pas réécraser le JSON-first):
  ```python
  # n'entrer dans le parsing HTML→JSON que si aucune donnée JSON-first n'a été fournie
  if html_content is not None and parsed_data_json is None:
      ...
  ```
- **Éviter l’import local `json`** qui masque le module global:
  ```python
  import json as _json
  parsed_data = parsed_data_json if isinstance(parsed_data_json, (dict, list)) else _json.loads(parsed_data_json)
  escaped_data_json = _json.dumps(parsed_data, ensure_ascii=False)
  ```

# Guide des Templates Runtime

Ce document décrit le système d'unification des templates pour les activités interactives et fournit un patron pour créer de nouveaux templates runtime.

## 🆕 Refactoring 2025-09-30 : Centralisation de la détection JSON-first

### ✅ Modifications appliquées

Pour éviter la duplication de code et garantir la cohérence, la détection des ressources JSON-first a été centralisée :

#### Backend (`backend/constants.py` - NOUVEAU)
```python
JSON_FIRST_SUBTYPES = ['champlex2', 'champlex', 'qcm', 'pendu', 'quisuisje', 'textereconstitue', 'vocabulaire']

def is_json_first_resource(type_key: str, subtype_key: str) -> bool:
    return (
        type_key.lower().strip() == 'exercice' and 
        subtype_key.lower().strip() in JSON_FIRST_SUBTYPES_SET
    )
```

**Fichiers refactorés** :
- ✅ `routers/resource_create_router.py` - 3 utilisations de la fonction centralisée
- ✅ `routers/resource_update_router.py` - 1 utilisation de la fonction centralisée
- ✅ `ai/services/content_merger.py` - Import de `JSON_FIRST_SUBTYPES`

#### Frontend (`frontend/src/utils/resourceFormUtils.js`)
```javascript
export const isDynamicResource = (resourceData) => {
  const subtypeKey = (resourceData?.sub_type?.key || resourceData?.resource_sub_type?.key || '').toLowerCase();
  const dynamicSubtypes = new Set(['champlex2', 'champlex', 'qcm', 'pendu', 'quisuisje', 'vocabulaire', 'textereconstitue']);
  return dynamicSubtypes.has(subtypeKey);
};
```

**Fichiers refactorés** :
- ✅ `ResourceActionLink.js` - Utilise `isDynamicResource()` pour le bouton "Lancer l'activité"
- ✅ `useResourceHtmlContent.js` - Utilise `isDynamicResource()` pour l'affichage dynamique

### 🎯 Impact

**Avant** : Liste dupliquée dans **10+ endroits** différents  
**Après** : **2 sources uniques** (1 backend + 1 frontend)

**Avantages** :
- ✅ Ajout d'un nouveau type : **2 modifications** au lieu de 10+
- ✅ Cohérence garantie entre tous les modules
- ✅ Code plus maintenable et lisible
- ✅ Réduction drastique du risque d'erreur

---

## 1. Architecture du système JSON-first

### 1.1. Types d'exercices JSON-first supportés

Flash Français Reborn utilise un système "JSON-first" pour les exercices interactifs qui génèrent des données structurées via l'IA :
- `qcm` : Questions à choix multiples
- `champlex` : Champ lexical simple
- `champlex2` : Champ lexical avancé
- `pendu` : Jeu du pendu
- `quisuisje` : Jeu "Qui suis-je" avec indices progressifs
- `vocabulaire` : Exercice de vocabulaire avec paires mot-définition
- `textereconstitue` : Texte à reconstituer (ordre des éléments)

**Note importante** : Cette liste est centralisée dans `backend/constants.py` pour garantir la cohérence entre frontend et backend.

### 1.2. Principe d'unification

Pour garantir un rendu visuel identique entre la version générée par l'IA et la version post-édition, chaque type d'activité utilise :
- **Template de base** : `backend/ai/template/default_{type}_{subtype}.html` (utilisé pour la génération IA et l'édition)
- **Template runtime** : `backend/ai/template_runtime/{subtype}_runtime_template.html` (utilisé pour l'activité autonome)
- **Données canoniques** : `data_json` (format JSON standardisé par type d'activité)

### 1.2. Résolution automatique des chemins

Le `TemplateResolver` déduit automatiquement les chemins :

```python
from ai.services.template_resolver import TemplateResolver

# Résolution automatique pour un QCM
base_path, runtime_path, template_key = TemplateResolver.resolve_templates('exercice', 'qcm')
# base_path: backend/ai/template/default_exercice_qcm.html
# runtime_path: backend/ai/template_runtime/qcm_runtime_template.html  
# template_key: exercice_qcm_v1
```

## 2. Édition spécialisée des activités JSON-first

### 2.1. Exigence d'éditeurs spécialisés

**Tous les types d'activités JSON-first DOIVENT avoir un éditeur spécialisé** dans `frontend/src/components/resources/editors/` :

- **QCM** : `QcmEditor.js` - Interface pour créer/modifier questions à choix multiples
- **Champ lexical** : `ChamplexEditor.js` et `Champlex2Editor.js` - Gestion des champs lexicaux
- **Pendu** : `PenduEditor.js` - Éditeur pour mots à deviner
- **Qui suis-je** : `QuisuisjeEditor.js` - Éditeur pour mots avec indices progressifs
- **Texte reconstitué** : `TextereconstitueEditor.js` - Éditeur pour titres/consigne/éléments, indices, connecteurs, critères
- **Vocabulaire** : `VocabulaireEditor.js` - Éditeur pour paires mot-définition

### 2.2. Structure des éditeurs

Les éditeurs spécialisés doivent :

1. **Être exportés** dans `frontend/src/components/resources/editors/index.js`
2. **Être référencés** dans la fonction `getStructuredEditor()`
3. **Fournir une interface graphique** adaptée au format JSON du type d'activité
4. **Intégrer le chat IA** pour assistance à la création
5. **Valider les données** avant sauvegarde

### 2.3. Avantages des éditeurs spécialisés

- **Interface intuitive** : Adaptation parfaite au format de données
- **Validation en temps réel** : Contrôle des contraintes métier
- **Assistance IA** : Chat intégré pour génération/amélioration du contenu
- **Cohérence** : Respect du format JSON canonique

## 3. Structure d'un template runtime

### 2.1. Ossature HTML type

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{TYPE} - Activité</title>
    <style>
        /* CSS aligné sur le template de base correspondant */
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 700px;
            margin: 40px auto;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            padding: 32px 40px 40px 40px;
        }
        /* ... autres règles CSS identiques au template de base ... */
    </style>
</head>
<body>
    <div class="container">
        <h1 id="title">{TYPE}</h1>
        <div id="desc" class="description"></div>
        <div id="content"></div>
        <div class="results" id="results"></div>
        <button class="submit-btn" id="validateBtn">Valider</button>
        <button class="reset-btn" id="resetBtn">Recommencer</button>
    </div>
    <script>
        // Données injectées par le backend
        window.ACTIVITY_DATA = <!--ACTIVITY_DATA_JSON-->;
        
        // Logique d'initialisation et d'interaction
        document.addEventListener('DOMContentLoaded', function() {
            // Initialiser l'activité depuis ACTIVITY_DATA
            initializeActivity();
        });
    </script>
</body>
</html>
```

### 2.2. Placeholder de données

Le backend remplace `<!--ACTIVITY_DATA_JSON-->` par les données JSON réelles :

```javascript
// Exemple pour un QCM
window.ACTIVITY_DATA = {
    "titre": "Les temps du récit",
    "description": "Identifiez les temps utilisés dans les phrases suivantes.",
    "questions": [
        {
            "id": "q1",
            "texte": "Il était une fois...",
            "options": [
                {"id": "a", "texte": "Imparfait"},
                {"id": "b", "texte": "Passé simple"}
            ],
            "reponse_correcte": "a",
            "explication": "L'imparfait exprime une action habituelle dans le passé."
        }
    ]
};
```

## 3. Checklist de conversion d'un template existant

### 3.1. Identifier le template à convertir

- Localiser le template dans `backend/ai/template/`
- Identifier le couple `(type, subtype)` depuis le nom de fichier
- Exemple : `default_exercice_qcm.html` → `('exercice', 'qcm')`

### 3.2. Créer le template runtime

1. **Créer le fichier** : `backend/ai/template_runtime/{subtype}_runtime_template.html`
2. **Copier la structure CSS** du template de base
3. **Remplacer le contenu statique** par une génération dynamique JavaScript
4. **Ajouter le placeholder** : `<!--ACTIVITY_DATA_JSON-->`
5. **Implémenter la logique interactive** (validation, reset, feedback)

### 3.3. Tester la résolution automatique

```python
# Vérifier que le TemplateResolver trouve les deux templates
base_path, runtime_path, template_key = TemplateResolver.resolve_templates('exercice', 'qcm')
assert base_path.exists(), f"Template de base manquant: {base_path}"
assert runtime_path.exists(), f"Template runtime manquant: {runtime_path}"
```

### 3.4. Adapter la logique de sauvegarde

Si le type d'activité n'est pas encore géré dans `routers/resource.py`, ajouter :

```python
# Dans update_resource_route, section parsing HTML → JSON
if t_key == 'exercice' and st_key == 'nouveau_type':
    parsed_data_json = html_to_nouveau_type_json(html_content)
    logger.info(f"[NOUVEAU_TYPE] data_json parsé depuis HTML pour resource_id={resource_id}")
    # Le reste est automatique via TemplateResolver
```

## 4. Exemples de templates runtime existants

### 4.1. QCM (`qcm_runtime_template.html`)

- **Données** : `{ titre, description, questions: [{ id, texte, options: [{ id, texte }], reponse_correcte, explication }] }`
- **Interactions** : Sélection radio, validation avec score, affichage des explications
- **Style** : Aligné sur `default_exercice_qcm.html`

### 4.2. Qui suis-je (`quisuisje_runtime_template.html`)

- **Données** : `{ titre, description, vocabulaire: [{ word, indices: [string] }] }`
- **Interactions** : Indices progressifs, système de points dégressif, feedback intelligent
- **Style** : Interface moderne avec animations, gestion des indices par étapes
- **Éditeur** : `QuisuisjeEditor.js` - Interface graphique pour gérer mots et indices

### 4.3. Texte reconstitué (`textereconstitue_runtime_template.html`)

- **Données** (normalisées côté runtime): soit `{ ... }` soit `{ exercice: { ... } }` avec:
  - `titre`, `theme`, `type_texte`, `difficulte`, `consigne`
  - `elements_melanges: [{ id:number, contenu:string, marqueurs_logiques:string[] }]`
  - `ordre_correct: number[]`
  - `texte_original`
  - `explication: { logique_construction, structure_textuelle, connecteurs_cles: [{connecteur, fonction}] }`
  - `criteres_evaluation: [{ critere, description, points }]`
- **Placeholder**: `<!--TEXTERECONSTITUE_DATA_JSON-->`
- **Variable JavaScript**: `window.TEXTERECONSTITUE_DATA`
- **Interactions**: Drag & drop des éléments, vérification d’ordre, affichage de la solution et des explications
- **Éditeur**: `TextereconstitueEditor.js` (UI + validation + intégration IA)

### 4.4. Vocabulaire (`vocabulaire_runtime_template.html`)

- **Données** : `{ titre, description, niveau, theme, vocabulaire: [{ word, definition }] }`
- **Interactions** : Saisie de définitions, validation avec feedback, score basé sur la similarité
- **Style** : Interface moderne avec zones de saisie, couleurs pour les réponses correctes/incorrectes
- **Éditeur** : `VocabulaireEditor.js` - Interface graphique pour gérer les paires mot-définition
- **Placeholder** : `<!--VOCABULAIRE_DATA_JSON-->`
- **Variable JavaScript** : `window.VOCABULAIRE_DATA`

#### Analyse de Texte (`default_exercice_analysetexte.html`)
- **Statut** : **Statique** (pas de template runtime)
- **Contenu** : Fiche d'analyse structurée avec 6 sections prédéfinies
- **Données** : Intégrées directement dans le HTML (pas d'injection dynamique)
- **Style** : Design élégant avec dégradés, sections colorées
- **Raison** : L'analyse de texte est un document de référence, pas une activité interactive

#### Dictée (`default_exercice_dictee.html`)
- **Statut** : **Statique** (pas de template runtime)
- **Contenu** : Titre de la dictée, texte avec mots-clés mis en évidence, bloc d'explications
- **Données** : Intégrées directement dans le HTML (pas d'injection dynamique)
- **Raison** : Lecture par l'enseignant, impression/partage, pas d'interactivité prévue

## 5. Conventions de nommage

### 5.1. Fichiers

- Template de base : `default_{type}_{subtype}.html`
- Template runtime : `{subtype}_runtime_template.html`
- Fichier runtime généré : `runtime_{subtype}_{resource_id}.html`

### 5.2. Clés de template

- Format : `{type}_{subtype}_v{version}`
- Exemple : `exercice_qcm_v1`, `lecon_fichemethode_v1`

### 5.3. Placeholder JSON

- Nom générique : `<!--ACTIVITY_DATA_JSON-->`
- Variable JavaScript : `window.ACTIVITY_DATA`

## 6. Déploiement et migrations

### 6.1. Migrations requises

```bash
# Ajouter les colonnes de template si pas encore fait
alembic upgrade head
```

### 6.2. Vérification post-déploiement

1. **Templates accessibles** : Vérifier que `backend/ai/template_runtime/` est déployé
2. **Résolution fonctionnelle** : Tester `TemplateResolver.resolve_templates()`
3. **Génération runtime** : Sauvegarder une activité et vérifier `runtime_html_url`
4. **Bouton "Lancer l'activité"** : Tester l'ouverture de l'activité autonome

## 7. Dépannage

### 7.1. Template runtime non trouvé

```
[EXERCICE/QCM] Template runtime non trouvé: None
```

**Solution** : Créer `backend/ai/template_runtime/qcm_runtime_template.html`

### 7.2. Données JSON non injectées dans les exercices JSON-first

**Symptôme** : Les colonnes `data_json` et `runtime_html_path` sont vides en base de données

**Causes possibles** :
1. **Frontend** : `ai_content_json` non envoyé dans `useSubmitLogic.js`
2. **Backend** : Type non inclus dans les listes JSON-first de `resource_crud_router.py`
3. **Template** : Placeholder incorrect ou manquant
4. **Content Merger** : Type non géré dans `content_merger.py`

**Solutions** :
- ✅ **Backend** : Vérifier que le type est dans `backend/constants.py` → `JSON_FIRST_SUBTYPES`
- ✅ **Frontend** : Vérifier que le type est dans `frontend/src/utils/resourceFormUtils.js` → `dynamicSubtypes`
- ✅ **Template** : Vérifier que le placeholder spécifique existe (ex: `<!--VOCABULAIRE_DATA_JSON-->`)
- ✅ **Frontend (génération)** : Vérifier que `ai_content_json` est envoyé dans `useSubmitLogic.js`

## 8. Procédure pour ajouter un nouvel exercice JSON-first

### 8.1. ⚡ Modification centralisée (OBLIGATOIRE)

**ÉTAPE 1** : Ajouter le nouveau type dans `backend/constants.py` :

```python
JSON_FIRST_SUBTYPES = [
    'champlex2',
    'champlex',
    'qcm',
    'pendu',
    'quisuisje',
    'textereconstitue',
    'vocabulaire',
    'NOUVEAU_TYPE'  # ← AJOUTER ICI
]
```

Cette modification unique met automatiquement à jour :
- ✅ `resource_create_router.py` - Détection JSON-first lors de la création
- ✅ `resource_update_router.py` - Validation des données JSON-first
- ✅ `content_merger.py` - Fusion des données avec le template runtime

### 8.2. Checklist complète

1. **Créer l'éditeur spécialisé** : `{Type}Editor.js` dans `frontend/src/components/resources/editors/`
    - Interface graphique adaptée au format JSON
    - Validation des données et chat IA intégré
    - Export dans `index.js` et fonction `getStructuredEditor()`

2. **Créer le template runtime** : `{type}_runtime_template.html` avec placeholder `<!--{TYPE}_DATA_JSON-->`

3. **Ajouter dans `frontend/src/utils/resourceFormUtils.js`** :
    - Ajouter le nouveau type dans le Set `dynamicSubtypes`
    ```javascript
    const dynamicSubtypes = new Set(['champlex2', 'champlex', 'qcm', 'pendu', 'quisuisje', 'vocabulaire', 'textereconstitue', 'NOUVEAU_TYPE']);
    ```

4. **Ajouter dans `backend/constants.py`** (voir étape 1)

### 8.3. Architecture de détection centralisée

#### Backend (`constants.py`)

```python
# Liste unique des types JSON-first
JSON_FIRST_SUBTYPES = ['champlex2', 'champlex', 'qcm', 'pendu', 'quisuisje', 'textereconstitue', 'vocabulaire']

# Fonction utilitaire de détection
def is_json_first_resource(type_key: str, subtype_key: str) -> bool:
    return (
        type_key.lower().strip() == 'exercice' and 
        subtype_key.lower().strip() in JSON_FIRST_SUBTYPES_SET
    )
```

**Utilisée dans** :
- ✅ `resource_create_router.py` (lignes 236, 262, 266)
- ✅ `resource_update_router.py` (ligne 130)  
- ✅ `content_merger.py` (ligne 50)

#### Frontend (`resourceFormUtils.js`)

```javascript
export const isDynamicResource = (resourceData) => {
  const subtypeKey = (resourceData?.sub_type?.key || resourceData?.resource_sub_type?.key || '').toLowerCase();
  const dynamicSubtypes = new Set(['champlex2', 'champlex', 'qcm', 'pendu', 'quisuisje', 'vocabulaire', 'textereconstitue']);
  
  return dynamicSubtypes.has(subtypeKey);
};
```

**Utilisée dans** :
- ✅ `ResourceActionLink.js` (ligne 29) - Bouton "Lancer l'activité"
- ✅ `useResourceHtmlContent.js` (ligne 22) - Affichage "Contenu HTML (dynamique)"

#### Avantages de la centralisation

1. ✅ **Source unique de vérité** : Une seule modification pour mettre à jour partout
2. ✅ **Cohérence garantie** : Impossible d'avoir des listes différentes selon les fichiers
3. ✅ **Maintenabilité** : Ajout d'un nouveau type en 2 endroits au lieu de 10+
4. ✅ **Moins d'erreurs** : Réduction drastique du risque d'oubli

### 8.4. Points critiques

- ⚠️ **Le frontend DOIT envoyer `ai_content_json`** sinon les colonnes BDD restent vides
- ⚠️ **Chaque type a son propre placeholder spécifique** dans le template
- ⚠️ **Le backend DOIT remplacer le placeholder** lors de la génération du runtime sinon les données ne s'afficheront pas
- ⚠️ **Toujours tester la mise à jour complète** : génération IA → modification → sauvegarde → vérification BDD
- ⚠️ **Toujours tester la création complète** : génération IA → fusion → création → BDD

### 8.5. Explication détaillée : resource_update_router.py

**Problème identifié** : Lors de la mise à jour d'une ressource, les données JSON ne sont pas injectées dans le template runtime car le placeholder spécifique n'est pas remplacé.

**Code à ajouter** dans `resource_update_router.py` ligne ~153 :

```python
# Support de plusieurs placeholders selon le template
injected = raw_template.replace('<!--ACTIVITY_DATA_JSON-->', data_str)
injected = injected.replace('<!--QCM_DATA_JSON-->', data_str)
injected = injected.replace('<!--CHAMPLEX_DATA_JSON-->', data_str)
injected = injected.replace('<!--PENDU_DATA_JSON-->', data_str)
injected = injected.replace('<!--QUISUISJE_DATA_JSON-->', data_str)
injected = injected.replace('<!--TEXTERECONSTITUE_DATA_JSON-->', data_str)
injected = injected.replace('<!--VOCABULAIRE_DATA_JSON-->', data_str)  # ← AJOUTER POUR CHAQUE NOUVEAU TYPE
injected = injected.replace('<!--NOUVEAU_TYPE_DATA_JSON-->', data_str)  # ← AJOUTER POUR CHAQUE NOUVEAU TYPE
```

**Pourquoi c'est nécessaire** :
- Chaque type d'exercice a son propre placeholder dans son template runtime
- Sans ce remplacement, le JavaScript reçoit `window.VOCABULAIRE_DATA = <!--VOCABULAIRE_DATA_JSON-->` au lieu des vraies données
- Les données sont perdues et l'activité ne fonctionne pas

**Exemple de symptômes** :
- Les données sont sauvegardées en BDD mais n'apparaissent pas dans l'activité
- Console JavaScript : `undefined` pour les données de l'activité
- Interface vide ou dysfonctionnelle
