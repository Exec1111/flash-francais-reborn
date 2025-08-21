# Déploiement — Render

## Fichier Render
- `render.yaml`: définit les services (backend, éventuellement frontend), build et start commands.

## Variables d’environnement (backend)
- `GOOGLE_API_KEY`: clé API pour le SDK `google-genai`.
- `GEMINI_CHAT_MODEL`: identifiant du modèle (ex: `gemini-1.5-pro`).
- `UPLOADS_BASE_DIR`: répertoire base pour le stockage (persistance Render Disk, ex: `/var/data/uploads-storage`).

## Stockage persistant
- Monter un disque persistant et le mapper à `UPLOADS_BASE_DIR`.
- Conserver des chemins relatifs en BDD (portabilité locale/Render).

## Bonnes pratiques
- Ne pas commiter de clés.
- Vérifier les tailles max upload (`MAX_UPLOAD_SIZE_MB`).
