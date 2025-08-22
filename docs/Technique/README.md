# Documentation technique — Flash Français Reborn

Ce répertoire rassemble nos spécifications techniques détaillées. Ce document sert de synthèse rapide et oriente vers les focus spécialisés.

## Vue d'ensemble du système

**Flash Français Reborn** est une plateforme d'enseignement du français qui combine une interface web moderne avec des capacités d'intelligence artificielle pour la génération de ressources pédagogiques. Le système permet aux enseignants de créer et gérer des progressions, séquences, séances et ressources éducatives avec l'aide de l'IA.

### Architecture générale
- **Backend**: FastAPI (Python) avec SQLAlchemy ORM
- **Frontend**: React avec Material-UI et React Router
- **Base de données**: PostgreSQL avec migrations Alembic
- **IA**: Google Gemini API pour la génération de contenu
- **Stockage**: Système de fichiers avec support Render Disk
- **Authentification**: JWT avec gestion des rôles (enseignant, étudiant, admin)

## Table des matières

### Documentation principale
- [Architecture système](./architecture.md) - Vue d'ensemble technique et composants
- [Schéma base de données](./database-schema.md) - Modèles de données et relations
- [Endpoints API](./api-endpoints.md) - Documentation complète des API REST
- [Authentification](./authentication.md) - Sécurité et gestion des utilisateurs

### Modules spécialisés
- [Module IA](./ai-module.md) - Prompts, génération et fusion de contenu
- [Modèle Ressource](./resources.md) - Gestion des ressources et stockage
- [Extraction Docling](./docling.md) - Traitement PDF → Markdown + tables
- [Architecture Frontend](./frontend-architecture.md) - Structure React et composants

### Déploiement et opérations
- [Déploiement Render](./deployment-render.md) - Configuration et variables d'environnement
- [API Extraction PDF](./pdf-extraction-api.md) - Endpoints spécialisés pour PDF

## Points d'entrée principaux

### Backend
- `backend/app.py` - Application FastAPI principale
- `backend/models/` - Modèles de données SQLAlchemy
- `backend/routers/` - Endpoints API organisés par domaine
- `backend/ai/` - Services d'intelligence artificielle

### Frontend
- `frontend/src/App.js` - Application React principale
- `frontend/src/components/` - Composants réutilisables
- `frontend/src/pages/` - Pages de l'application
- `frontend/src/services/` - Services API et utilitaires

## Démarrage rapide

### Prérequis
- Python 3.8+
- Node.js 16+
- PostgreSQL
- Clé API Google Gemini

### Installation
```bash
# Backend
cd backend
pip install -r requirements.txt
python -m alembic upgrade head

# Frontend
cd frontend
npm install
npm start
```

### Variables d'environnement
```bash
# Backend
DATABASE_URL=postgresql://user:pass@localhost/db
GOOGLE_API_KEY=your_gemini_api_key
SECRET_KEY=your_secret_key

# Frontend
REACT_APP_API_BASE_URL=http://localhost:10000/api/v1
```

## Conventions de développement

### Code
- **Backend**: Type hints, docstrings, tests avec pytest
- **Frontend**: Composants fonctionnels, hooks React, ESLint
- **Base de données**: Migrations Alembic, chemins relatifs pour portabilité

### Documentation
- Chemins de code: `backend/models/user.py`
- Variables d'environnement: `UPLOADS_BASE_DIR`
- Endpoints API: `/api/v1/resources/`

### Sécurité
- JWT pour l'authentification
- Validation Pydantic des données
- Sanitisation des entrées utilisateur
- Gestion des rôles et permissions

## Contribution

1. Respecter les conventions de nommage
2. Ajouter des tests pour les nouvelles fonctionnalités
3. Documenter les changements dans les fichiers appropriés
4. Maintenir la compatibilité avec l'existant

## Support et dépannage

Consulter les sections "Bonnes pratiques" et "Limitations actuelles" dans chaque document spécialisé pour des conseils opérationnels.

## Liens utiles
- `AI.md` (racine): description fonctionnelle de la génération IA
- `backend/` et `frontend/`: code source principal
- Tests: `backend/tests/` et `frontend/src/` (tests à implémenter)

---

*Dernière mise à jour: 2025*
