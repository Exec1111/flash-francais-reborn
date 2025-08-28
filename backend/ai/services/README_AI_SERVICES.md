# Services IA - Configuration et Basculement entre Modèles

Ce document explique comment configurer et basculer entre différents modèles d'IA dans l'application Flash Français Reborn.

## Architecture

L'application utilise un système de factory pattern qui permet de basculer facilement entre différents fournisseurs d'IA selon le type de prompt utilisé.

### Structure des Services

```
backend/ai/services/
├── base_ai_service.py          # Service abstrait de base
├── openai_service.py           # Service OpenAI (GPT-4o mini, etc.)
├── google_service.py           # Service Google Gemini
├── ai_service_factory.py       # Factory pour créer les services
├── html_editor_ai_service.py   # Service spécialisé pour l'éditeur HTML
└── README_AI_SERVICES.md       # Ce fichier
```

## Configuration par Type de Prompt

### Configuration par Défaut

```python
# Dans ai_service_factory.py
_prompt_model_config = {
    "html_editor": {
        "provider": "openai",  # Utilise OpenAI GPT-4o mini
        "model": None          # Utilise le modèle par défaut du .env
    },
    "ai_resource_generation": {
        "provider": "gemini",  # Utilise Google Gemini
        "model": None
    },
    "ai_resource_merge": {
        "provider": "gemini",  # Utilise Google Gemini
        "model": None
    }
}
```

### Variables d'Environnement

Ajoutez ces variables dans votre fichier `.env` :

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_CHAT_MODEL=gpt-4o-mini

# Google Gemini Configuration (existant)
GOOGLE_API_KEY=your-google-api-key-here
GEMINI_CHAT_MODEL=gemini-1.5-flash-latest
```

## Comment Basculer entre Modèles

### 1. Via Variables d'Environnement (Recommandé)

Pour changer le fournisseur d'un type de prompt spécifique :

```bash
# Utiliser OpenAI pour l'éditeur HTML
HTML_EDITOR_AI_PROVIDER=openai
HTML_EDITOR_AI_MODEL=gpt-4o-mini

# Utiliser Gemini pour la génération de ressources
AI_RESOURCE_GENERATION_AI_PROVIDER=gemini
AI_RESOURCE_GENERATION_AI_MODEL=gemini-1.5-pro
```

### 2. Via Code (Programmation)

```python
from backend.ai.services.ai_service_factory import AIServiceFactory

# Changer la configuration pour un type de prompt
AIServiceFactory.update_prompt_config(
    prompt_type="html_editor",
    provider="gemini",
    model="gemini-1.5-flash-latest"
)

# Créer un service avec la nouvelle configuration
service = AIServiceFactory.create_service("html_editor")
```

### 3. Utilisation Directe d'un Service

```python
from backend.ai.services.openai_service import OpenAIService
from backend.ai.services.google_service import GoogleService

# Utiliser OpenAI directement
openai_service = OpenAIService(model_name="gpt-4o-mini")

# Utiliser Google Gemini directement
gemini_service = GoogleService(model_name="gemini-1.5-pro")
```

## Modèles Supportés

### OpenAI
- `gpt-4o-mini` (recommandé pour l'éditeur HTML)
- `gpt-4o`
- `gpt-4-turbo`
- `gpt-3.5-turbo`

### Google Gemini
- `gemini-1.5-flash-latest` (rapide, économique)
- `gemini-1.5-pro-latest` (plus puissant)
- `gemini-1.0-pro`

## Ajout d'un Nouveau Fournisseur

1. **Créer le service** : Hériter de `BaseAIService`
2. **Implémenter les méthodes** : `generate_content()` et `get_provider_name()`
3. **Ajouter au factory** : Mettre à jour `_services` dans `ai_service_factory.py`
4. **Configurer** : Ajouter les variables d'environnement nécessaires

Exemple :

```python
# nouveau_service.py
from .base_ai_service import BaseAIService

class NouveauService(BaseAIService):
    def get_provider_name(self) -> str:
        return "nouveau_provider"
    
    async def generate_content(self, system_prompt, user_prompt, **kwargs):
        # Implémentation spécifique
        pass

# Dans ai_service_factory.py
_services = {
    "openai": OpenAIService,
    "gemini": GoogleService,
    "nouveau": NouveauService  # Ajouter ici
}
```

## Debugging et Logs

Les interactions avec l'IA sont automatiquement loggées dans la base de données via `LLMInteractionLog`. Vous pouvez voir :

- Le fournisseur utilisé
- Le modèle utilisé
- La durée de l'appel
- Les erreurs éventuelles

```python
# Voir les logs dans les fichiers de log
logger.info(f"Service IA créé: {provider} (modèle: {service.model_name})")
```

## Fallback et Gestion d'Erreurs

Le système inclut un mécanisme de fallback :

1. Si un fournisseur échoue, le système essaie de basculer vers Gemini
2. Si le parsing JSON échoue, un message générique est retourné
3. Toutes les erreurs sont loggées pour le debugging

## Performance et Coûts

### OpenAI GPT-4o mini
- ✅ Très rapide
- ✅ Économique
- ✅ Excellent pour l'édition HTML
- ✅ Format JSON fiable

### Google Gemini
- ✅ Gratuit (avec limites)
- ✅ Bon pour la génération de contenu long
- ⚠️ Parfois moins fiable pour le JSON strict

## Recommandations

1. **Éditeur HTML** : Utiliser OpenAI GPT-4o mini (configuration par défaut)
2. **Génération de ressources** : Garder Google Gemini (économique)
3. **Production** : Surveiller les coûts et performances
4. **Développement** : Utiliser les modèles les plus rapides

## Dépannage

### Erreur "API Key manquante"
Vérifiez que les variables d'environnement sont bien définies dans `.env`

### Erreur de parsing JSON
Le système a un fallback automatique, mais vérifiez les logs pour identifier le problème

### Service non trouvé
Vérifiez que le fournisseur est bien ajouté dans `_services` du factory

### Performance lente
Considérez utiliser un modèle plus rapide ou changer de fournisseur
