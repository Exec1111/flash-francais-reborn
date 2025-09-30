# Édition Inline des Titres de Ressources

## Vue d'ensemble

Fonctionnalité permettant d'éditer rapidement le titre d'une ressource directement depuis la liste des ressources, sans avoir à ouvrir le formulaire complet d'édition.

## Composants

### Frontend

#### InlineTitleEditor.jsx
Composant React réutilisable qui gère l'édition inline du titre.

**Props:**
- `title` (string) : Titre actuel de la ressource
- `resourceId` (number) : ID de la ressource
- `onSave` (function) : Callback appelé après sauvegarde réussie `(resourceId, newTitle)`
- `titleProps` (object) : Props Material-UI optionnelles pour le Typography
- `onClick` (function) : Callback optionnel pour le clic sur le titre (désactivé en mode édition)

**Fonctionnalités:**
- 🖱️ Icône d'édition visible au survol du titre
- ⌨️ Support des raccourcis clavier :
  - `Enter` : Valider la modification
  - `Escape` : Annuler l'édition
- ✅ Validation : empêche la sauvegarde d'un titre vide
- 🔄 Indicateur de chargement pendant la sauvegarde
- ❌ Gestion des erreurs avec affichage du message
- 🎨 Animation fluide entre mode lecture et édition

**États:**
- **Mode lecture** : Affiche le titre avec une icône d'édition au survol
- **Mode édition** : Champ de saisie avec boutons Valider/Annuler

#### Intégration dans ResourceList.js

Le composant est intégré dans :
1. **Vue tabulaire (DataGrid)** : Colonne "Titre"
2. **Vue en fiches (Cards)** : Header de la carte

**Gestionnaire `handleTitleSave`:**
```javascript
const handleTitleSave = (resourceId, newTitle) => {
  setResources(prevResources => 
    prevResources.map(resource => 
      resource.id === resourceId 
        ? { ...resource, title: newTitle }
        : resource
    )
  );
};
```

### Backend

#### Route PATCH `/api/v1/resources/{resource_id}`

**Méthode:** PATCH  
**Authentification:** Requise (Bearer token)  
**Autorisation:** Propriétaire de la ressource uniquement

**Body (JSON):**
```json
{
  "title": "Nouveau titre"
}
```

**Réponse (200 OK):**
```json
{
  "id": 123,
  "title": "Nouveau titre",
  "description": "...",
  ...
}
```

**Erreurs possibles:**
- `404 Not Found` : Ressource inexistante
- `403 Forbidden` : Utilisateur non autorisé
- `500 Internal Server Error` : Erreur serveur

**Implémentation:**
- Fichier: `backend/routers/resource_update_router.py`
- Fonction: `patch_resource_title()`
- Mise à jour partielle : seuls les champs fournis sont modifiés
- Support actuel : `title` et `description`

## Utilisation

### Pour l'utilisateur final

1. **Vue tabulaire :**
   - Survolez le titre d'une ressource
   - Cliquez sur l'icône crayon qui apparaît
   - Modifiez le titre
   - Appuyez sur `Enter` ou cliquez sur ✓ pour sauvegarder
   - Ou appuyez sur `Escape` ou cliquez sur ✗ pour annuler

2. **Vue en fiches :**
   - Même procédure dans le header de la carte

### Pour les développeurs

#### Ajouter l'édition inline à un autre composant

```jsx
import InlineTitleEditor from './components/resources/InlineTitleEditor';

<InlineTitleEditor
  title={resource.title}
  resourceId={resource.id}
  onSave={(id, newTitle) => {
    // Mettre à jour l'état local
    console.log(`Ressource ${id} renommée: ${newTitle}`);
  }}
  titleProps={{
    variant: 'h6',
    color: 'primary',
    sx: { fontWeight: 'bold' }
  }}
  onClick={() => navigate(`/resources/${resource.id}`)}
/>
```

## Avantages

✅ **Rapidité** : Modification en 2 clics sans changer de page  
✅ **Expérience utilisateur** : Interface intuitive et réactive  
✅ **Performance** : Mise à jour partielle via PATCH (pas de rechargement complet)  
✅ **Fiabilité** : Validation côté client et serveur  
✅ **Sécurité** : Vérification d'autorisation côté backend  
✅ **Réutilisabilité** : Composant générique facilement réutilisable  

## Évolutions possibles

- [ ] Support de l'édition d'autres champs (description, tags, etc.)
- [ ] Historique des modifications
- [ ] Undo/Redo
- [ ] Édition en masse (multi-sélection)
- [ ] Validation avancée (longueur min/max, caractères interdits)
- [ ] Notification toast après sauvegarde réussie
