# HTML Editor Chatbot - Centralized Prompt Implementation

## Résumé de l'implémentation

L'assistant IA pour l'édition HTML a été mis à jour pour utiliser le système de prompts YAML centralisé du projet, conformément aux bonnes pratiques d'architecture.

## Changements effectués

### 1. Configuration YAML centralisée
**Fichier créé :** `backend/ai/prompts/config/prompts/html_editor.yaml`

- **Description :** Configuration complète du prompt pour l'assistant IA d'édition HTML
- **Fonctionnalités :**
  - Prompt système définissant le rôle et les contraintes techniques
  - Template de prompt utilisateur avec support Jinja2
  - Paramètres typés pour `user_message`, `current_html`, et `conversation_history`
  - Contraintes par défaut pour maintenir les bonnes pratiques HTML
  - Schéma de réponse JSON structuré

### 2. Schéma JSON de validation
**Fichier créé :** `backend/ai/prompts/config/schemas/html_editor.schema.json`

- **Validation :** Assure que l'IA retourne toujours les champs `message` et `modified_html`
- **Sécurité :** Prévient les réponses malformées qui pourraient casser l'interface

### 3. Intégration au registre centralisé
**Fichier modifié :** `backend/ai/services/registry.py`

- **Ajout :** Entrée `("html", "editor")` dans le `PROMPT_REGISTRY`
- **Configuration :** Utilise le modèle Gemini Flash pour des réponses rapides
- **Cohérence :** Suit le même pattern que les autres prompts du projet

### 4. Service mis à jour
**Fichier existant :** `backend/ai/services/html_editor_ai_service.py`

- **Avant :** Prompts codés en dur dans le service Python
- **Après :** Utilise `PromptGenerator("html_editor")` pour charger la configuration YAML
- **Avantages :**
  - Prompts modifiables sans redémarrage du serveur
  - Cohérence avec l'architecture existante
  - Facilité de maintenance et d'évolution

## Architecture technique

### Frontend (React)
```
ResourceForm.js
├── TinyHtmlEditor (éditeur principal)
└── HtmlChatBot (assistant IA)
    └── HtmlChatService.js (API calls)
```

### Backend (FastAPI)
```
/html-chat/process
├── html_chat.py (router)
├── html_editor_ai_service.py (logique métier)
├── html_editor.yaml (configuration prompt)
└── html_editor.schema.json (validation)
```

## Fonctionnalités

### Chat éphémère
- **Contexte :** Maintenu uniquement pendant la session d'édition
- **Historique :** Géré côté frontend en React state
- **Simplicité :** Pas de persistance en base de données

### Assistance IA intelligente
- **Contextuel :** Comprend le HTML actuel et l'historique conversationnel
- **Sémantique :** Préserve la structure et l'accessibilité du HTML
- **Explicatif :** Fournit des explanations claires des modifications

### Interface utilisateur
- **Responsive :** Layout adaptatif avec TinyMCE et chatbot côte à côte
- **Intégré :** Apparaît naturellement dans le formulaire d'édition de ressources
- **Intuitif :** Messages horodatés avec avatars distinctifs

## Tests et validation

✅ **Configuration YAML** : Chargement et parsing validés  
✅ **Génération de prompts** : Templates Jinja2 fonctionnels  
✅ **Service backend** : Pas d'erreurs de syntaxe ou d'imports  
✅ **API endpoints** : Router correctement configuré  
✅ **Frontend integration** : Composants React sans erreurs  

## Bénéfices de la centralisation

1. **Maintenabilité** : Prompts modifiables sans code Python
2. **Cohérence** : Même architecture que les autres services IA
3. **Versioning** : Prompts versionnés avec le code
4. **Testabilité** : Prompts isolés et testables indépendamment
5. **Collaboration** : Prompts modifiables par les non-développeurs

## Utilisation

L'assistant IA est disponible automatiquement lors de l'édition de ressources HTML existantes. Il apparaît à droite de l'éditeur TinyMCE et permet de demander des modifications en langage naturel :

- "Corrige l'orthographe"
- "Ajoute une classe CSS 'highlight' au titre"
- "Change la couleur du texte en bleu"
- "Rends ce paragraphe plus accessible"

Les modifications sont appliquées directement dans l'éditeur et expliquées clairement à l'utilisateur.