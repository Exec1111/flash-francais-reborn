# Parcours utilisateurs — Workflows et journées types

## Vue d'ensemble

Cette documentation présente les parcours utilisateurs principaux de Flash Français Reborn, décrivant comment les différents acteurs interagissent avec la plateforme dans des scénarios réels d'utilisation.

## Rôles utilisateurs

### 👨‍🏫 Enseignant
**Persona** : Marie Dupont, professeure de français en lycée, 15 ans d'expérience
- Besoin : Créer des séquences pédagogiques efficaces et variées
- Objectif : Gagner du temps sur la préparation des cours
- Contraintes : Programmes scolaires stricts, diversité des niveaux

### 👨‍🎓 Élève
**Persona** : Thomas Martin, élève de seconde, 16 ans
- Besoin : Accéder facilement aux ressources de cours
- Objectif : Comprendre et progresser en français
- Contraintes : Temps limité, préférence pour le contenu numérique

### 👨‍💼 Administrateur
**Persona** : Claire Dubois, responsable pédagogique
- Besoin : Superviser l'utilisation de la plateforme
- Objectif : Assurer la qualité pédagogique et technique
- Contraintes : Vue d'ensemble, gestion des utilisateurs

## Parcours enseignant

### 1. Configuration initiale

**Objectif** : Mettre en place son espace de travail pédagogique

```
Connexion → Création profil → Configuration préférences → Premier accès au tableau de bord
```

**Étapes détaillées :**
1. **Inscription** : Email, nom, prénom, établissement
2. **Validation** : Email de confirmation avec lien d'activation
3. **Première connexion** : Découverte de l'interface
4. **Configuration** : Préférences d'affichage, paramètres IA

### 2. Création d'une progression annuelle

**Objectif** : Structurer l'année scolaire

```
Tableau de bord → Nouvelle progression → Définition des paramètres → Sauvegarde
```

**Étapes détaillées :**
1. **Accès** : Bouton "Nouvelle progression" depuis le tableau de bord
2. **Paramétrage** :
   - Titre : "Français Seconde - Année 2024-2025"
   - Description : Objectifs généraux et thématiques
   - Niveau : Seconde (A2-B1)
   - Durée : 30 semaines
3. **Validation** : Vérification des informations
4. **Confirmation** : Progression créée et visible dans l'arborescence

### 3. Développement d'une séquence thématique

**Objectif** : Préparer une unité d'enseignement cohérente

```
Sélection progression → Nouvelle séquence → Configuration → Ajout d'objectifs → Planification des séances
```

**Étapes détaillées :**
1. **Contexte** : Clic sur la progression dans l'arborescence
2. **Création** : Bouton "Nouvelle séquence"
3. **Paramétrage** :
   - Titre : "Le roman au XIXe siècle"
   - Durée : 6 semaines
   - Objectifs CECRL : Compréhension écrite B1, expression écrite A2
4. **Association** : Lien avec les objectifs d'apprentissage
5. **Planification** : Création des 6 séances de cours

### 4. Préparation d'une séance de cours

**Objectif** : Organiser un cours complet avec ressources

```
Sélection séquence → Nouvelle séance → Définition du contenu → Génération de ressources → Finalisation
```

**Étapes détaillées :**
1. **Accès** : Navigation dans l'arborescence séquence → séances
2. **Création** : "Nouvelle séance"
3. **Paramétrage** :
   - Titre : "Introduction au réalisme"
   - Durée : 2h
   - Type : Cours magistral + exercices
4. **Assistant IA** : Lancement du générateur de ressources
5. **Sélection** : Choix des types d'exercices (QCM, analyse de texte)
6. **Génération** : Production automatique du contenu
7. **Édition** : Ajustement du contenu généré
8. **Association** : Lien avec les objectifs de la séquence
9. **Finalisation** : Sauvegarde de la séance complète

### 5. Génération de ressources avec IA

**Objectif** : Créer des exercices pédagogiques personnalisés

```
Assistant IA → Sélection du type → Configuration → Génération → Édition → Fusion → Sauvegarde
```

**Étapes détaillées :**
1. **Lancement** : Bouton "Générer des ressources" dans une séance
2. **Sélection** : Choix du type (QCM, dictée, mots croisés, analyse)
3. **Configuration** :
   - Thème : "Le réalisme chez Maupassant"
   - Niveau : B1
   - Nombre d'exercices : 15 questions
4. **Génération** : Traitement par l'IA (barre de progression)
5. **Prévisualisation** : Affichage du contenu généré
6. **Édition** : Modification des questions/réponses
7. **Fusion** : Intégration dans template HTML
8. **Validation** : Vérification du rendu final
9. **Sauvegarde** : Stockage dans la séance

### 6. Gestion des ressources documentaires

**Objectif** : Intégrer des documents externes (PDF, texte)

```
Upload → Traitement automatique → Association → Validation
```

**Étapes détaillées :**
1. **Sélection** : Zone d'upload dans la gestion des ressources
2. **Upload** : Glisser-déposer ou sélection de fichiers
3. **Traitement** : Extraction automatique du contenu (PDF)
4. **Métadonnées** : Saisie du titre, description, type
5. **Association** : Lien avec objectifs et séances
6. **Validation** : Vérification de la qualité du document

## Parcours élève

### 1. Accès aux cours

**Objectif** : Consulter les ressources pédagogiques assignées

```
Connexion → Tableau de bord → Sélection séquence → Consultation ressources
```

**Étapes détaillées :**
1. **Connexion** : Identifiants fournis par l'enseignant
2. **Vue d'ensemble** : Liste des séquences disponibles
3. **Navigation** : Exploration de l'arborescence pédagogique
4. **Accès** : Clic sur une séance pour voir les ressources
5. **Consultation** : Lecture des documents et exercices

### 2. Réalisation d'exercices

**Objectif** : Effectuer les activités pédagogiques

```
Sélection exercice → Lecture consigne → Réalisation → Auto-correction → Validation
```

**Étapes détaillées :**
1. **Accès** : Clic sur un exercice dans la liste des ressources
2. **Compréhension** : Lecture des instructions
3. **Réalisation** : Saisie des réponses (QCM, texte libre)
4. **Correction** : Vérification automatique si disponible
5. **Feedback** : Affichage des résultats et corrections

## Parcours administrateur

### 1. Gestion des utilisateurs

**Objectif** : Administrer les comptes utilisateurs

```
Administration → Utilisateurs → Création/Modification → Gestion des rôles
```

**Étapes détaillées :**
1. **Accès** : Section administration du tableau de bord
2. **Liste** : Consultation des utilisateurs existants
3. **Création** : Formulaire d'inscription pour nouveaux enseignants
4. **Modification** : Changement de rôle ou désactivation
5. **Validation** : Confirmation des changements

### 2. Supervision pédagogique

**Objectif** : Contrôler la qualité des contenus

```
Tableau de bord admin → Progressions → Consultation → Validation
```

**Étapes détaillées :**
1. **Vue d'ensemble** : Liste de toutes les progressions
2. **Inspection** : Consultation du contenu des séquences
3. **Évaluation** : Vérification de l'alignement pédagogique
4. **Feedback** : Commentaires aux enseignants si nécessaire

## Workflows transversaux

### Collaboration entre enseignants

**Objectif** : Partager et réutiliser des ressources

```
Recherche → Consultation → Adaptation → Intégration
```

**Étapes détaillées :**
1. **Recherche** : Moteur de recherche de ressources
2. **Consultation** : Prévisualisation des contenus
3. **Évaluation** : Vérification de la pertinence
4. **Adaptation** : Modification pour son contexte
5. **Intégration** : Ajout dans ses propres séquences

### Maintenance et évolution

**Objectif** : Mettre à jour les contenus pédagogiques

```
Identification → Mise à jour → Validation → Déploiement
```

**Étapes détaillées :**
1. **Audit** : Vérification des contenus obsolètes
2. **Modification** : Mise à jour des ressources
3. **Test** : Validation des changements
4. **Publication** : Déploiement pour les élèves

## Scénarios d'usage avancés

### Préparation d'une évaluation

**Objectif** : Créer une évaluation complète

```
Séance évaluation → Génération QCM → Création sujet → Préparation corrigé → Finalisation
```

### Adaptation pour inclusion

**Objectif** : Personnaliser les ressources pour des besoins spécifiques

```
Ressource existante → Modification paramètres → Adaptation contenu → Validation accessibilité
```

### Travail en équipe

**Objectif** : Collaboration sur une séquence

```
Partage séquence → Attribution tâches → Révision collective → Validation finale
```

## Points de douleur et solutions

### Problèmes courants

1. **Temps de génération IA** : Solution - Préparation en amont
2. **Complexité de l'interface** : Solution - Tutoriels intégrés
3. **Gestion des versions** : Solution - Historique automatique
4. **Partage de ressources** : Solution - Système de favoris

### Optimisations UX

1. **Raccourcis clavier** : Navigation rapide
2. **Modèles prédéfinis** : Templates de séquences
3. **Assistant contextuel** : Aide intelligente
4. **Notifications** : Alertes sur les actions importantes

---

*Documentation des parcours utilisateurs — Comprendre comment utiliser la plateforme*