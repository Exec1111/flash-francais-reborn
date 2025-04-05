# Flash Français

Application d'apprentissage du français utilisant des flashcards.

## Structure du Projet

```
flash-francais/
├── frontend/           # Application React
├── backend/            # API Python
└── docker/             # Configuration Docker
```

## Prérequis

- Node.js >= 16
- Python >= 3.8
- PostgreSQL >= 13
- Docker (optionnel)

## Installation

### Backend
```bash
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
L API sera disponible sur http://localhost:10000
Documentation Swagger : http://localhost:10000/docs

### Frontend

```bash
netstat -ano | findstr :3000
taskkill /F /PID xxxx
cd frontend
npm install
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

1.  **Assurez-vous que le serveur backend est en cours d'exécution** dans un terminal séparé (voir section "Démarrage > Backend").
2.  **Assurez-vous que la base de données est initialisée et potentiellement peuplée.** Vous pouvez utiliser les scripts `init_db.py`, `clear_db.py` et `populate_db.py` dans le répertoire `backend` pour gérer l'état de la base de données avant les tests.
    ```bash
    cd backend
    # Optionnel : Vider la base
    python clear_db.py 
    # Optionnel : Peupler avec des données de test
    python populate_db.py 
    ```
