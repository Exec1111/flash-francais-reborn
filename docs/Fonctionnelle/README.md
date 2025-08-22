# Documentation Fonctionnelle — Flash Français Reborn

## Vue d'ensemble

**Flash Français Reborn** est une plateforme d'enseignement du français qui révolutionne la création de ressources pédagogiques grâce à l'intelligence artificielle. La plateforme permet aux enseignants de concevoir, organiser et diffuser des parcours d'apprentissage personnalisés tout en bénéficiant d'outils d'assistance IA pour la génération automatique de contenu éducatif.

## Objectif de la plateforme

Simplifier et enrichir l'enseignement du français en offrant aux éducateurs des outils modernes pour :
- Créer des parcours pédagogiques structurés et cohérents
- Générer automatiquement des ressources éducatives de qualité
- Gérer efficacement les progressions, séquences et séances de cours
- Collaborer et partager des ressources pédagogiques
- Suivre la progression des apprenants

## Public cible

### Enseignants (Rôle principal)
- Professeurs de français dans l'enseignement secondaire
- Éducateurs spécialisés dans l'enseignement des langues
- Formateurs en français langue étrangère (FLE)
- Professeurs des écoles préparant des séquences pédagogiques

### Élèves/Apprenants
- Lycéens et collégiens suivant des cours de français
- Adultes en formation continue
- Étudiants étrangers apprenant le français

### Administrateurs
- Gestionnaires pédagogiques
- Responsables de formation
- Administrateurs système

## Architecture fonctionnelle

### Hiérarchie pédagogique
```
Progressions (Parcours annuels)
├── Séquences (Unités thématiques)
    ├── Séances (Cours individuels)
        ├── Objectifs d'apprentissage
        ├── Ressources pédagogiques
        └── Activités
```

### Types de ressources
- **Ressources générées par IA** : Exercices, QCM, analyses de texte, jeux linguistiques
- **Ressources uploadées** : Documents PDF, textes, images, audio
- **Ressources manuelles** : Contenu créé directement dans la plateforme

## Table des matières

### Parcours utilisateur
- [Parcours utilisateurs](./user-workflows.md) - Journées types et workflows
- [Récits utilisateur](./user-stories.md) - Cas d'usage et scénarios

### Fonctionnalités
- [Catalogue des fonctionnalités](./features.md) - Capacités de la plateforme
- [Règles métier](./business-rules.md) - Logique et contraintes fonctionnelles

## Démarrage rapide

### Pour les enseignants
1. **Créer un compte** avec le rôle "enseignant"
2. **Concevoir une progression** pour l'année scolaire
3. **Structurer des séquences** thématiques
4. **Planifier des séances** de cours
5. **Générer des ressources** avec l'assistant IA
6. **Assigner des objectifs** d'apprentissage

### Pour les apprenants
1. **Se connecter** avec les identifiants fournis
2. **Accéder aux séquences** assignées
3. **Consulter les ressources** pédagogiques
4. **Suivre les objectifs** d'apprentissage

## Capacités clés

### Génération IA de contenu
- **Exercices variés** : QCM, dictées, mots croisés, analyses de texte
- **Personnalisation** : Adaptation au niveau et aux objectifs
- **Formats multiples** : HTML interactif, PDF, documents texte

### Gestion pédagogique
- **Structure hiérarchique** : Progressions → Séquences → Séances
- **Objectifs d'apprentissage** : Cadre européen commun de référence (CECRL)
- **Association flexible** : Ressources liées aux objectifs et séances

### Collaboration et partage
- **Espace personnel** : Ressources privées par utilisateur
- **Partage contrôlé** : Gestion des permissions d'accès
- **Réutilisation** : Import et adaptation de ressources existantes

## Interface utilisateur

### Navigation intuitive
- **Arborescence visuelle** : Exploration des progressions et séquences
- **Assistant IA intégré** : Génération guidée de ressources
- **Tableaux de bord** : Vue d'ensemble des activités

### Fonctionnalités avancées
- **Éditeur riche** : Création de contenu formaté
- **Upload de documents** : Support PDF avec extraction automatique
- **Chat en temps réel** : Communication intégrée

## Sécurité et confidentialité

### Gestion des accès
- **Authentification sécurisée** : Connexion par email/mot de passe
- **Rôles et permissions** : Contrôle d'accès granulaire
- **Données personnelles** : Protection des informations utilisateur

### Conformité pédagogique
- **Standards éducatifs** : Alignement avec les programmes scolaires
- **Évaluation continue** : Suivi des objectifs et compétences
- **Accessibilité** : Interface adaptée aux différents besoins

## Évolution et support

### Mises à jour régulières
- **Nouvelles fonctionnalités** : Enrichissement continu des capacités IA
- **Amélioration UX** : Optimisation de l'interface utilisateur
- **Performance** : Optimisation des temps de réponse

### Support et formation
- **Documentation complète** : Guides d'utilisation détaillés
- **Formation en ligne** : Tutoriels et vidéos explicatives
- **Support technique** : Assistance réactive

---

*Documentation fonctionnelle — Comprendre ce que fait la plateforme*