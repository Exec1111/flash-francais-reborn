# Flash Français Reborn

Application d'apprentissage du français utilisant des flashcards et des progressions pédagogiques.

## Analyse détaillée du projet

### Architecture globale

Flash Français Reborn est une application web moderne avec une architecture client-serveur :
- **Frontend** : Application React utilisant Material-UI pour l'interface utilisateur
- **Backend** : API REST construite avec FastAPI (Python)
- **Base de données** : PostgreSQL pour le stockage des données

## Structure du Projet

```
flash-francais-reborn/
├── frontend/           # Application React
│   ├── src/
│   │   ├── components/ # Composants réutilisables 
│   │   ├── contexts/   # Contextes React (auth, données d'arborescence)
│   │   ├── pages/      # Pages de l'application
│   │   ├── services/   # Services pour les appels API
│   │   └── App.js      # Point d'entrée de l'application React
├── backend/            # API FastAPI
│   ├── alembic/        # Migrations de base de données
│   ├── ai/             # Modules d'intelligence artificielle
│   ├── crud/           # Opérations CRUD pour chaque entité
│   ├── models/         # Modèles SQLAlchemy (structure de la BDD)
│   ├── routers/        # Points d'entrée API pour chaque ressource
│   ├── schemas/        # Schémas Pydantic (validation et sérialization)
│   ├── tests/          # Tests unitaires et d'intégration
│   ├── app.py          # Point d'entrée du backend
│   └── security.py     # Gestion de l'authentification et autorisations
└── render.yaml         # Configuration de déploiement pour Render.com
```

## Fonctionnement du Backend

### Technologie et dépendances

Le backend est construit avec FastAPI et utilise les technologies suivantes :
- **FastAPI** : Framework web Python moderne et performant
- **SQLAlchemy** : ORM pour la gestion de la base de données
- **Pydantic** : Validation des données et sérialisation
- **Alembic** : Gestion des migrations de base de données
- **JWT** (JSON Web Tokens) : Authentification des utilisateurs
- **LangChain** : Intégration avec des modèles d'IA (OpenAI, Google)

### Structure du Backend

#### Modèles de données (SQLAlchemy)

Le schéma de base de données comprend plusieurs entités principales :
- **User** : Utilisateurs (étudiants, enseignants, administrateurs)
- **Progression** : Représente un parcours d'apprentissage
- **Sequence** : Sous-ensemble d'une progression
- **Session** : Instance d'une séquence représentant une séance de travail
- **Resource** : Ressources pédagogiques (textes, images, audio, etc.)
- **Objective** : Objectifs pédagogiques

Les relations entre ces entités sont gérées via des associations SQLAlchemy.

#### API Endpoints

L'API est organisée en routeurs thématiques :
- `/api/v1/auth` : Gestion de l'authentification
- `/api/v1/progressions` : Gestion des progressions
- `/api/v1/sequences` : Gestion des séquences
- `/api/v1/sessions` : Gestion des séances
- `/api/v1/resources` : Gestion des ressources
- `/api/v1/objectives` : Gestion des objectifs
- `/api/v1/ai` : Services d'intelligence artificielle
- `/api/v1/dashboard` : Données pour le tableau de bord

### Système d'authentification

L'authentification repose sur JWT :
1. L'utilisateur s'authentifie avec son email/mot de passe
2. Le backend génère un token JWT
3. Le frontend stocke ce token dans le localStorage
4. Les requêtes ultérieures incluent ce token dans l'en-tête Authorization

Le système implémente différents niveaux d'autorisation (étudiant, enseignant, administrateur).

### Gestion des ressources

Le système permet de :
- Uploader différents types de fichiers
- Organiser les ressources en types et sous-types
- Associer des ressources aux séquences et objectifs

Les fichiers uploadés sont stockés dans le système de fichiers et référencés en base de données.

## Fonctionnement du Frontend

### Technologie et dépendances

Le frontend est construit avec React et utilise :
- **React** : Bibliothèque UI
- **React Router** : Navigation entre les pages
- **Material UI** : Framework de composants UI
- **Axios** : Client HTTP pour les appels API
- **Context API** : Gestion de l'état global (authentification, données)

### Structure du Frontend

#### Composants principaux

- **AuthContext** : Gestion de l'état d'authentification et des sessions
- **TreeDataContext** : Gestion des données d'arborescence pour les progressions
- **SideTreeView** : Navigation hiérarchique dans les progressions
- **Layout protégé** : Structure commune pour les pages authentifiées

#### Navigation et Routage

L'application utilise React Router avec des routes protégées qui vérifient l'authentification :
- Routes publiques : accueil, connexion, inscription
- Routes protégées : tableau de bord, progressions, ressources

#### Gestion de l'authentification

Le frontend gère l'authentification via :
1. Le service `auth.js` qui communique avec l'API
2. Le contexte `AuthContext.js` qui maintient l'état d'authentification
3. Le stockage du token JWT dans localStorage

### Fonctionnalités principales

- Construction et visualisation de progressions pédagogiques
- Gestion des ressources (upload, édition, visualisation)
- Chatbox intégrée avec assistance IA
- Tableau de bord analytics

## Prérequis

- Node.js >= 16
- Python >= 3.8
- PostgreSQL >= 13
- Docker (optionnel)

## Installation

### Backend
Activation et installation :
```bash
cd backend
.\venv\Scripts\activate
python -m pip install -r requirements.txt
python app.py
```

L'API sera disponible sur http://localhost:10000
Documentation Swagger : http://localhost:10000/docs

### Frontend

```bash
netstat -ano | findstr :3000  # Vérifier si le port est occupé
taskkill /F /PID xxxx         # Libérer le port si nécessaire
cd frontend
npm install
npm start
```

Le frontend sera disponible sur http://localhost:3000

## Base de données

PostgreSQL est utilisé comme base de données.
Configuration dans le fichier `.env` :

```env
DATABASE_URL=postgresql://postgres:123456@localhost:5432/flash_francais
```

### Initialisation de la base de données

Pour initialiser la base de données localement :

```bash
cd backend
python init_db.py
```

Ce script crée les tables nécessaires et applique les migrations Alembic.

## Déploiement

L'application est déployée sur Render.com.
La configuration du déploiement se trouve dans le fichier `render.yaml`.

### Configuration sur Render

- **Build Command** : `pip install -r requirements.txt`
- **Pre-Deploy Command** : `cp .env.production .env && python init_db.py`
- **Start Command** : `python app.py`

### Variables d'environnement

Les variables d'environnement suivantes sont configurées sur Render :

- `DATABASE_URL` : URL de connexion à la base de données PostgreSQL
- `PYTHON_VERSION` : Version de Python (3.11.11)
- `SECRET_KEY` : Clé secrète pour la sécurité de l'application
- `RENDER` : Défini sur `true` pour l'environnement Render

## Tests

Les tests API se trouvent dans le répertoire `backend/tests/api_tests/`.
Pour exécuter les tests :

1. **Assurez-vous que le serveur backend est en cours d'exécution** dans un terminal séparé.
2. **Assurez-vous que la base de données est initialisée et potentiellement peuplée.** Vous pouvez utiliser les scripts `init_db.py`, `clear_db.py` et `populate_db.py` dans le répertoire `backend` pour gérer l'état de la base de données avant les tests.
    ```bash
    cd backend
    # Optionnel : Vider la base
    python clear_db.py 
    # Optionnel : Peupler avec des données de test
    python populate_db.py
    ```

## Spécificités techniques importantes

### Comportement particulier du backend

Certaines routes de l'API nécessitent d'être définies comme des fonctions asynchrones (`async def`) pour fonctionner correctement. Par exemple, la route `GET /api/v1/resources/by_session/{session_id}` dans `routers/resource.py` nécessite la syntaxe asynchrone pour éviter les erreurs 404, malgré le fait que FastAPI supporte normalement les deux styles.

### Gestion des tokens d'authentification

Le jeton d'authentification JWT est stocké dans le localStorage du navigateur sous la clé 'token'. Cette information est critique pour les appels API nécessitant une authentification.

Dans le frontend, pour récupérer ce jeton lors des appels API nécessitant une authentification, on utilise : `localStorage.getItem('token')`
