# Règles métier — Logique et contraintes fonctionnelles

## Vue d'ensemble

Ce document décrit les règles métier, contraintes fonctionnelles et logique de validation qui régissent le comportement de Flash Français Reborn. Ces règles assurent la cohérence pédagogique et la qualité des contenus générés.

## Règles de gestion pédagogique

### 1. Structure hiérarchique

#### Règle 1.1 : Hiérarchie obligatoire
**Énoncé** : Toute ressource doit être associée à au moins une séance
**Raison** : Assurer le contexte pédagogique des ressources
**Contrôle** : Validation à la création/modification de ressources
**Exception** : Ressources de référence générale (manuelles)

#### Règle 1.2 : Ordre chronologique des séquences
**Énoncé** : Les séquences d'une progression doivent avoir un ordre numérique unique
**Raison** : Respecter la progression pédagogique
**Contrôle** : Validation d'unicité de l'ordre par progression
**Exception** : Aucune

#### Règle 1.3 : Durée des séances
**Énoncé** : La durée d'une séance doit être comprise entre 15 minutes et 4 heures
**Raison** : Respecter les contraintes temporelles scolaires
**Contrôle** : Validation à la saisie (min: 15, max: 240 minutes)
**Exception** : Séances spéciales (évaluations longues)

### 2. Objectifs d'apprentissage

#### Règle 2.1 : Cadre européen de référence (CECRL)
**Énoncé** : Les objectifs doivent référencer un niveau CECRL valide (A1, A2, B1, B2, C1, C2)
**Raison** : Standardisation européenne des niveaux de langue
**Contrôle** : Liste de valeurs autorisées
**Exception** : Objectifs transversaux sans niveau spécifique

#### Règle 2.2 : Association obligatoire
**Énoncé** : Toute séquence doit être associée à au moins un objectif d'apprentissage
**Raison** : Garantir l'alignement pédagogique
**Contrôle** : Validation à la finalisation de la séquence
**Exception** : Séquences d'introduction générale

#### Règle 2.3 : Cohérence niveau/objectif
**Énoncé** : Les objectifs associés à une séquence doivent être cohérents avec le niveau de la progression
**Raison** : Éviter les écarts pédagogiques importants
**Contrôle** : Alerte si décalage de plus de 2 niveaux
**Exception** : Objectifs de consolidation

### 3. Gestion des ressources

#### Règle 3.1 : Types de ressources autorisés
**Énoncé** : Seuls les types de ressources prédéfinis sont autorisés
**Raison** : Maintenir la cohérence du système de classification
**Contrôle** : Validation contre la table de référence `resource_types`
**Exception** : Aucune

#### Règle 3.2 : Sous-types par type
**Énoncé** : Les sous-types doivent correspondre au type de ressource parent
**Raison** : Respecter la hiérarchie de classification
**Contrôle** : Validation des associations type/sous-type
**Exception** : Aucune

#### Règle 3.3 : Taille des fichiers
**Énoncé** : La taille des fichiers uploadés ne doit pas dépasser 50 Mo
**Raison** : Contraintes techniques et de performance
**Contrôle** : Validation avant upload
**Exception** : Ressources générées par IA (pas de limite)

#### Règle 3.4 : Formats de fichiers acceptés
**Énoncé** : Seuls les formats pédagogiquement pertinents sont autorisés
**Raison** : Sécurité et cohérence pédagogique
**Contrôle** : Validation de l'extension et du type MIME
**Exception** : Documents administratifs (PDF uniquement)

### 4. Génération IA

#### Règle 4.1 : Paramètres obligatoires
**Énoncé** : Tous les paramètres requis doivent être fournis pour la génération IA
**Raison** : Qualité et pertinence du contenu généré
**Contrôle** : Validation des champs obligatoires par type de ressource
**Exception** : Aucune

#### Règle 4.2 : Cohérence thématique
**Énoncé** : Le thème doit être cohérent avec le niveau et les objectifs
**Raison** : Éviter les contenus inadaptés
**Contrôle** : Validation sémantique basique
**Exception** : Ressources de découverte

#### Règle 4.3 : Limites de génération
**Énoncé** : Maximum 10 ressources peuvent être générées simultanément
**Raison** : Gestion de la charge serveur et UX
**Contrôle** : Limitation dans l'interface
**Exception** : Génération par lot pour les administrateurs

#### Règle 4.4 : Validation du contenu généré
**Énoncé** : Le contenu IA doit respecter les contraintes pédagogiques
**Raison** : Garantir la qualité éducative
**Contrôle** : Validation post-génération
**Exception** : Contenu en cours d'édition

## Règles de sécurité et d'accès

### 5. Gestion des utilisateurs

#### Règle 5.1 : Rôles utilisateur
**Énoncé** : Seuls les rôles prédéfinis sont autorisés (teacher, student, admin)
**Raison** : Sécurité et séparation des responsabilités
**Contrôle** : Validation à la création/modification d'utilisateurs
**Exception** : Aucune

#### Règle 5.2 : Permissions par rôle
**Énoncé** : Les permissions sont strictement définies par rôle
**Raison** : Sécurité et conformité
**Contrôle** : Vérification des permissions à chaque action
**Exception** : Permissions spéciales temporaires

#### Règle 5.3 : Comptes actifs
**Énoncé** : Seuls les utilisateurs avec un compte actif peuvent se connecter
**Raison** : Gestion des départs et suspensions
**Contrôle** : Vérification du flag `is_active`
**Exception** : Aucune

### 6. Authentification et sessions

#### Règle 6.1 : Durée des sessions
**Énoncé** : Les sessions JWT expirent après 30 minutes d'inactivité
**Raison** : Sécurité des accès
**Contrôle** : Expiration automatique des tokens
**Exception** : Sessions administrateur (durée configurable)

#### Règle 6.2 : Tentatives de connexion
**Énoncé** : Maximum 5 tentatives de connexion échouées par heure
**Raison** : Protection contre les attaques par force brute
**Contrôle** : Compteur et temporisation
**Exception** : Aucune

#### Règle 6.3 : Complexité des mots de passe
**Énoncé** : Les mots de passe doivent contenir au moins 8 caractères avec lettres et chiffres
**Raison** : Sécurité des comptes utilisateur
**Contrôle** : Validation à la création/modification
**Exception** : Réinitialisation par email

## Règles de validation des données

### 7. Contraintes de nommage

#### Règle 7.1 : Titres des entités
**Énoncé** : Les titres ne doivent pas dépasser 200 caractères
**Raison** : Cohérence de l'interface
**Contrôle** : Validation à la saisie
**Exception** : Descriptions (500 caractères)

#### Règle 7.2 : Unicité des noms
**Énoncé** : Les noms d'entités doivent être uniques dans leur contexte
**Raison** : Éviter les confusions
**Contrôle** : Validation en base de données
**Exception** : Ressources (unicité par utilisateur)

#### Règle 7.3 : Caractères autorisés
**Énoncé** : Seuls les caractères alphanumériques et de ponctuation standard sont autorisés
**Raison** : Sécurité et compatibilité
**Contrôle** : Filtrage des caractères spéciaux
**Exception** : Contenu HTML (filtrage spécifique)

### 8. Contraintes temporelles

#### Règle 8.1 : Périodes de modification
**Énoncé** : Les progressions ne peuvent être modifiées que pendant l'année scolaire
**Raison** : Stabilité des parcours pédagogiques
**Contrôle** : Validation de la date
**Exception** : Modifications mineures par les administrateurs

#### Règle 8.2 : Archivage automatique
**Énoncé** : Les progressions de plus de 5 ans sont archivées automatiquement
**Raison** : Gestion de l'espace de stockage
**Contrôle** : Processus automatique annuel
**Exception** : Progressions marquées comme référence

## Règles de gestion de contenu

### 9. Extraction PDF

#### Règle 9.1 : Qualité d'extraction
**Énoncé** : Les PDF doivent avoir une qualité d'extraction supérieure à 70%
**Raison** : Fiabilité du contenu extrait
**Contrôle** : Validation du taux de reconnaissance
**Exception** : Documents scannés (seuil à 50%)

#### Règle 9.2 : Traitement asynchrone
**Énoncé** : L'extraction PDF doit être terminée dans les 10 minutes
**Raison** : UX et performance
**Contrôle** : Timeout et notification
**Exception** : Documents volumineux (30 minutes)

### 10. Templates et fusion

#### Règle 10.1 : Templates par défaut
**Énoncé** : Chaque type de ressource doit avoir un template HTML par défaut
**Raison** : Garantir l'affichage correct
**Contrôle** : Vérification à la génération
**Exception** : Ressources personnalisées

#### Règle 10.2 : Validation du HTML
**Énoncé** : Le HTML généré doit être valide et accessible
**Raison** : Conformité et accessibilité
**Contrôle** : Validation post-génération
**Exception** : Contenu en mode édition

## Règles de performance et de charge

### 11. Limites d'utilisation

#### Règle 11.1 : Génération IA par utilisateur
**Énoncé** : Maximum 50 générations IA par jour par utilisateur
**Raison** : Gestion de la charge et des coûts
**Contrôle** : Quota journalier
**Exception** : Administrateurs (quota étendu)

#### Règle 11.2 : Stockage par utilisateur
**Énoncé** : Maximum 2 Go de stockage par utilisateur
**Raison** : Équité et gestion des ressources
**Contrôle** : Surveillance de l'utilisation
**Exception** : Aucune

#### Règle 11.3 : Requêtes API
**Énoncé** : Maximum 1000 requêtes API par heure par utilisateur
**Raison** : Protection contre les abus
**Contrôle** : Rate limiting
**Exception** : Opérations de lecture (limite étendue)

## Règles de conformité

### 12. Protection des données

#### Règle 12.1 : Données personnelles
**Énoncé** : Les données personnelles sont chiffrées au repos
**Raison** : Conformité RGPD
**Contrôle** : Chiffrement automatique
**Exception** : Aucune

#### Règle 12.2 : Droit à l'oubli
**Énoncé** : Les données utilisateur sont supprimées dans les 30 jours après demande
**Raison** : Conformité RGPD
**Contrôle** : Processus de suppression
**Exception** : Données anonymisées pour statistiques

### 13. Accessibilité

#### Règle 13.1 : Conformité WCAG 2.1
**Énoncé** : L'interface doit respecter les standards d'accessibilité
**Raison** : Inclusion des utilisateurs en situation de handicap
**Contrôle** : Tests automatiques et manuels
**Exception** : Contenu généré par IA (validation post-génération)

## Gestion des erreurs et exceptions

### 14. Récupération d'erreurs

#### Règle 14.1 : Messages utilisateur
**Énoncé** : Les erreurs doivent être présentées de manière compréhensible
**Raison** : Amélioration de l'expérience utilisateur
**Contrôle** : Messages d'erreur standardisés
**Exception** : Erreurs techniques (logs détaillés)

#### Règle 14.2 : Reprise de processus
**Énoncé** : Les processus interrompus doivent pouvoir être repris
**Raison** : Robustesse du système
**Contrôle** : Points de sauvegarde
**Exception** : Erreurs de validation de données

### 15. Audit et traçabilité

#### Règle 15.1 : Journalisation des actions
**Énoncé** : Toutes les actions importantes sont journalisées
**Raison** : Audit et débogage
**Contrôle** : Logs automatiques
**Exception** : Actions de lecture

#### Règle 15.2 : Conservation des logs
**Énoncé** : Les logs sont conservés pendant 2 ans
**Raison** : Conformité légale
**Contrôle** : Rotation automatique
**Exception** : Logs de sécurité (5 ans)

## Évolution des règles

### 16. Mise à jour des règles

#### Règle 16.1 : Validation des changements
**Énoncé** : Toute modification de règle métier doit être validée
**Raison** : Maintenir la cohérence du système
**Contrôle** : Processus de validation
**Exception** : Corrections de bugs

#### Règle 16.2 : Communication des changements
**Énoncé** : Les changements de règles sont communiqués aux utilisateurs
**Raison** : Transparence
**Contrôle** : Notifications et documentation
**Exception** : Changements mineurs

---

*Documentation des règles métier — Comprendre les contraintes et la logique fonctionnelle*