# Guide des Templates Runtime

Ce document décrit le système d'unification des templates pour les activités interactives et fournit un patron pour créer de nouveaux templates runtime.

## 1. Architecture du système

### 1.1. Principe d'unification

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

## 2. Structure d'un template runtime

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

### 4.2. Templates statiques (exemples)

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

### 7.2. Données JSON non injectées

**Symptôme** : `window.ACTIVITY_DATA` est `undefined`

**Solution** : Vérifier que le placeholder `<!--ACTIVITY_DATA_JSON-->` est présent dans le template

### 7.3. Style différent entre base et runtime

**Solution** : Copier exactement les règles CSS du template de base vers le template runtime

---

*Ce guide sera mis à jour au fur et à mesure de l'ajout de nouveaux types d'activités.*
