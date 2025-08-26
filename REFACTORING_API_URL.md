# Guide de Refactorisation : Centralisation de l'API_BASE_URL

## Problème Identifié

Plusieurs composants redéfinissent localement `API_BASE_URL` au lieu d'utiliser la configuration centralisée dans `services/api.js`. Cela crée des risques d'erreur et complique la maintenance.

## Solution Mise en Place

### 1. Export centralisé dans `api.js`
```javascript
// services/api.js
export { API_BASE_URL };
export default api;
```

### 2. Pattern de refactorisation

**AVANT (problématique) :**
```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:10000';
```

**APRÈS (correct) :**
```javascript
import { API_BASE_URL } from '../../services/api';
```

## Composants à Refactoriser

### Priorité Haute (utilisent directement process.env)
- [x] `ResourceList.js` (ligne 152)
- [x] `SequenceDetails.js` (ligne 35)
- [x] `ResourceView.js` (ligne 19)
- [x] `SessionDetailPage.js` (ligne 38)
- [x] `ProposeWorks.js` (ligne 55)

### Priorité Moyenne (patterns mixtes)
- [x] `ResourceForm.js` (ligne 761) - utilise process.env inline
- [x] `useSubmitLogic.js` (ligne 26) - dans les hooks
- [x] `apiUtils.js` - service DynamicAIForm

### ✅ Déjà Corrigés
- [x] `ResourceDocumentLink.js` - refactorisé pour utiliser l'import centralisé
- [x] `ResourceEdit.js` - refactorisé pour utiliser resourceService
- [x] `DynamicAIForm/components/MergeStep.jsx` - refactorisé pour utiliser l'import centralisé
- [x] `wizard/MergeStep.jsx` - refactorisé pour utiliser l'import centralisé

## Composants supplémentaires découverts et corrigés

### 🚨 **Deuxième vague de refactorisation**
Ces composants utilisaient encore `process.env.REACT_APP_API_BASE_URL` après la première passe :

- [x] `components/DynamicAIForm/components/MergeStep.jsx` (ligne 12)
- [x] `components/wizard/MergeStep.jsx` (ligne 24) 
- [x] `components/DynamicAIForm/hooks/useFormSchema.js` (ligne 20)
- [x] `components/resources/ResourceForm.js` (ligne 230) - usage inline restant
- [x] `components/sessions/SessionFicheWizard.jsx` (ligne 21) - usage inline
- [x] `pages/sequences/ProposeSeances.js` (ligne 70)

**Note**: Ces composants ont été découverts après la refactorisation initiale et ont été corrigés avec le même pattern.

### ✅ **Résultat Final**
**Total des fichiers refactorisés : 15 fichiers**
- ✅ **Aucune erreur de syntaxe**
- ✅ **Une seule définition d'API_BASE_URL** (dans services/api.js)
- ✅ **Tous les composants utilisent l'import centralisé**
- ✅ **Pattern uniforme appliqué partout**

## Script de Refactorisation

Pour chaque composant, suivre ces étapes :

1. **Ajouter l'import** :
   ```javascript
   import { API_BASE_URL } from '../../services/api';
   ```

2. **Supprimer la redéfinition locale** :
   ```javascript
   // SUPPRIMER cette ligne
   const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:10000';
   ```

3. **Tester le composant** après refactorisation

## Avantages de Cette Approche

### ✅ Avantages
- **Configuration unique** - Un seul point de configuration
- **Maintenance simplifiée** - Changement d'environnement en un endroit
- **Réduction des erreurs** - Plus d'oublis de mise à jour
- **Tests plus faciles** - Mock centralisé
- **Cohérence** - Même comportement partout

### ❌ Risques Évités
- Configurations incohérentes entre composants
- Oubli de mise à jour lors de changement d'environnement
- Bugs difficiles à déboguer (comme le bug ResourceEdit.js)
- Code dupliqué

## Prochaines Étapes Recommandées

1. **Phase 1** : Refactoriser les composants listés ci-dessus
2. **Phase 2** : Ajouter une règle ESLint pour éviter les redéfinitions d'API_BASE_URL
3. **Phase 3** : Documenter le pattern dans la documentation du projet

## Exemple Complet

### ResourceList.js - Refactorisation
```javascript
// AVANT
import React from 'react';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:10000';

// APRÈS
import React from 'react';
import { API_BASE_URL } from '../../services/api';
```

Cette approche garantit que tous les composants utilisent exactement la même configuration d'URL, éliminant les risques d'incohérence.