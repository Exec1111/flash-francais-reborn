# Refactoring Frontend : Centralisation de la détection JSON-first

## 📅 Date : 2025-09-30

## 🎯 Objectif
Éliminer la duplication de la liste des types JSON-first dans le frontend en utilisant une fonction centralisée unique.

## ✅ Fichiers refactorés

### 1. Source unique : `frontend/src/utils/resourceFormUtils.js`

**Fonction centralisée** :
```javascript
export const isDynamicResource = (resourceData) => {
  const subtypeKey = (resourceData?.sub_type?.key || resourceData?.resource_sub_type?.key || '').toLowerCase();
  const dynamicSubtypes = new Set(['champlex2', 'champlex', 'qcm', 'pendu', 'quisuisje', 'vocabulaire', 'textereconstitue']);
  
  return dynamicSubtypes.has(subtypeKey);
};
```

### 2. Fichiers utilisant la fonction centralisée

#### ✅ `components/ResourceGenerationWizard/hooks/useMerging.js`
**Avant** :
```javascript
const isJsonFirstResource = (subtypeKey) => {
  const subtypeKeyNorm = (subtypeKey || '').toLowerCase();
  return ['champlex2', 'champlex', 'qcm', 'pendu', 'quisuisje', 'textereconstitue'].includes(subtypeKeyNorm);
};
```

**Après** :
```javascript
import { isDynamicResource } from '../../../utils/resourceFormUtils';

const isJsonFirstResource = (subtypeKey) => {
  return isDynamicResource({ sub_type: { key: subtypeKey } });
};
```

---

#### ✅ `components/ResourceGenerationWizard/services/saveService.js`
**Avant** :
```javascript
const subtypeKeyNorm = (subtype_key || '').toLowerCase();
const isJsonFirstResource = ['champlex2', 'champlex', 'qcm', 'pendu', 'quisuisje', 'textereconstitue'].includes(subtypeKeyNorm);
```

**Après** :
```javascript
import { isDynamicResource } from '../../../utils/resourceFormUtils';

const isJsonFirstResource = isDynamicResource({ sub_type: { key: subtype_key } });
```

---

#### ✅ `components/DynamicAIForm/hooks/useSubmitLogic.js`

**Ligne 569 - Avant** :
```javascript
const subtypeKeyNorm = (formData.subtypeKey || '').toLowerCase();
if (subtypeKeyNorm === 'champlex2' || subtypeKeyNorm === 'champlex' || subtypeKeyNorm === 'qcm' || subtypeKeyNorm === 'pendu' || subtypeKeyNorm === 'quisuisje' || subtypeKeyNorm === 'textereconstitue' || subtypeKeyNorm === 'vocabulaire') {
```

**Ligne 569 - Après** :
```javascript
import { isDynamicResource } from '../../../utils/resourceFormUtils';

const isJsonFirst = isDynamicResource({ sub_type: { key: formData.subtypeKey } });
if (isJsonFirst) {
```

**Ligne 746 - Avant** :
```javascript
const subtypeKeyNorm = (formData.subtypeKey || '').toLowerCase();
if ((subtypeKeyNorm === 'champlex2' || subtypeKeyNorm === 'champlex' || subtypeKeyNorm === 'qcm' || subtypeKeyNorm === 'pendu' || subtypeKeyNorm === 'quisuisje' || subtypeKeyNorm === 'textereconstitue' || subtypeKeyNorm === 'vocabulaire') && generationResults.length > 0) {
```

**Ligne 746 - Après** :
```javascript
const isJsonFirst = isDynamicResource({ sub_type: { key: formData.subtypeKey } });
if (isJsonFirst && generationResults.length > 0) {
```

---

#### ✅ `components/resources/ResourceActionLink.js`
```javascript
import { isDynamicResource } from '../../utils/resourceFormUtils';

const isExercise = isDynamicResource(fullResource);
```

---

#### ✅ `hooks/useResourceHtmlContent.js`
```javascript
import { isDynamicResource } from '../utils/resourceFormUtils';

const isDynamicActivity = isDynamicResource(initialData);
```

---

## 📊 Impact du refactoring

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| **Fichiers avec liste dupliquée** | 6 | 1 | -83% |
| **Lignes de code pour la détection** | ~40 lignes | ~7 lignes | -82% |
| **Endroits à modifier pour ajouter un type** | 6 | 1 | -83% |
| **Risque d'incohérence** | Élevé | Nul | ✅ |

## 🎯 Avantages

1. ✅ **Source unique de vérité** : Un seul endroit définit les types JSON-first
2. ✅ **Cohérence garantie** : Impossible d'avoir des listes différentes
3. ✅ **Maintenabilité** : Ajout d'un nouveau type en 1 seul endroit
4. ✅ **Lisibilité** : Code plus clair avec nom de fonction explicite
5. ✅ **Testabilité** : Fonction pure facilement testable

## 🔄 Procédure pour ajouter un nouveau type JSON-first

### Avant le refactoring
Il fallait modifier **6 fichiers** :
1. `useMerging.js` - Ligne 14
2. `saveService.js` - Ligne 46
3. `useSubmitLogic.js` - Ligne 569
4. `useSubmitLogic.js` - Ligne 746
5. `ResourceActionLink.js` - Logique locale
6. `useResourceHtmlContent.js` - Logique locale

### Après le refactoring
Il suffit de modifier **1 fichier** :
1. `resourceFormUtils.js` - Ligne 157 : Ajouter le nouveau type dans le Set

```javascript
const dynamicSubtypes = new Set([
  'champlex2', 
  'champlex', 
  'qcm', 
  'pendu', 
  'quisuisje', 
  'vocabulaire', 
  'textereconstitue',
  'NOUVEAU_TYPE'  // ← Ajouter ici
]);
```

## 🧪 Tests recommandés

Après ce refactoring, vérifier que :

1. ✅ Le bouton "Lancer l'activité" s'affiche uniquement pour les types JSON-first
2. ✅ L'affichage "Contenu HTML (dynamique)" fonctionne correctement
3. ✅ La génération de ressources JSON-first fonctionne (wizard)
4. ✅ La sauvegarde de ressources JSON-first envoie `ai_content_json`
5. ✅ Le contournement du merge fonctionne pour les types JSON-first
6. ✅ Les types non-JSON-first (dictée, analyse de texte) ne sont pas affectés

## 📝 Notes importantes

- La fonction `isDynamicResource()` accepte un objet avec `sub_type.key` ou `resource_sub_type.key`
- Cette flexibilité permet de l'utiliser avec différentes structures de données (API, state local, etc.)
- Le Set JavaScript offre une recherche O(1) pour de meilleures performances
- La normalisation en lowercase est faite automatiquement par la fonction

## 🔗 Synchronisation Backend

Le backend utilise une architecture similaire dans `backend/constants.py` :
- Liste unique : `JSON_FIRST_SUBTYPES`
- Fonction utilitaire : `is_json_first_resource(type_key, subtype_key)`
- Utilisée dans 3 routers : `resource_create_router.py`, `resource_update_router.py`, `content_merger.py`

**Important** : Maintenir la cohérence entre les listes frontend et backend lors de l'ajout d'un nouveau type.
