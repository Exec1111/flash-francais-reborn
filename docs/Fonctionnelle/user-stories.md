# Récits utilisateur — Cas d'usage et scénarios

## Vue d'ensemble

Cette documentation présente les récits utilisateur (user stories) de Flash Français Reborn, décrivant les besoins fonctionnels des différents acteurs à travers des scénarios concrets d'utilisation.

## Format des récits utilisateur

Chaque récit suit le format standard :
```
En tant que [rôle]
Je veux [fonctionnalité]
Afin de [bénéfice]
```

## Récits enseignants

### US-001 : Création d'une progression annuelle
**En tant qu'enseignant**  
**Je veux créer une progression pédagogique**  
**Afin de structurer mon année scolaire**

**Critères d'acceptation :**
- Créer une progression avec titre, description et niveau
- Définir la durée totale de la progression
- Associer des objets d'étude et des œuvres
- Visualiser la progression dans l'arborescence

**Scénario principal :**
1. L'enseignant se connecte à la plateforme
2. Il accède au tableau de bord
3. Il clique sur "Nouvelle progression"
4. Il remplit le formulaire (titre, description, niveau)
5. Il sauvegarde la progression
6. La progression apparaît dans l'arborescence

### US-002 : Génération d'exercices avec IA
**En tant qu'enseignant**  
**Je veux générer des exercices automatiquement**  
**Afin de gagner du temps dans la préparation de mes cours**

**Critères d'acceptation :**
- Sélectionner le type d'exercice (QCM, dictée, analyse)
- Configurer les paramètres (thème, niveau, difficulté)
- Prévisualiser le contenu généré
- Éditer et ajuster le contenu
- Sauvegarder l'exercice dans une séance

**Scénario principal :**
1. L'enseignant sélectionne une séance
2. Il lance l'assistant IA
3. Il choisit le type d'exercice
4. Il configure les paramètres
5. Il génère le contenu
6. Il édite le résultat si nécessaire
7. Il sauvegarde l'exercice

### US-003 : Organisation d'une séquence pédagogique
**En tant qu'enseignant**  
**Je veux structurer une séquence d'enseignement**  
**Afin d'assurer la cohérence de mes cours**

**Critères d'acceptation :**
- Créer une séquence dans une progression
- Définir les objectifs d'apprentissage
- Planifier les séances avec durée et type
- Associer des ressources à chaque séance
- Créer un bilan de fin de séquence

**Scénario principal :**
1. L'enseignant sélectionne une progression
2. Il crée une nouvelle séquence
3. Il définit les objectifs CECRL
4. Il planifie les séances
5. Il assigne des ressources
6. Il crée un bilan de séquence

### US-004 : Upload et traitement de documents PDF
**En tant qu'enseignant**  
**Je veux intégrer des documents externes**  
**Afin d'enrichir mes ressources pédagogiques**

**Critères d'acceptation :**
- Uploader des fichiers PDF
- Extraire automatiquement le contenu textuel
- Traiter les tableaux et images
- Associer le document à des objectifs
- Intégrer le document dans une séance

**Scénario principal :**
1. L'enseignant accède à la gestion des ressources
2. Il upload un fichier PDF
3. Le système traite le document
4. Il configure les métadonnées
5. Il associe le document à des objectifs
6. Il l'intègre dans une séance

### US-005 : Collaboration avec d'autres enseignants
**En tant qu'enseignant**  
**Je veux partager mes ressources**  
**Afin de bénéficier de l'expérience collective**

**Critères d'acceptation :**
- Rechercher des ressources existantes
- Consulter les ressources partagées
- Adapter une ressource pour mon usage
- Partager mes propres ressources
- Donner du feedback sur les ressources

**Scénario principal :**
1. L'enseignant recherche des ressources
2. Il consulte les résultats
3. Il sélectionne une ressource pertinente
4. Il l'adapte à ses besoins
5. Il l'intègre dans sa séquence

## Récits élèves

### US-006 : Accès aux ressources de cours
**En tant qu'élève**  
**Je veux accéder à mes cours**  
**Afin de suivre ma scolarité**

**Critères d'acceptation :**
- Voir la liste des séquences assignées
- Accéder aux ressources de chaque séance
- Consulter les objectifs d'apprentissage
- Télécharger les documents nécessaires
- Suivre ma progression

**Scénario principal :**
1. L'élève se connecte à la plateforme
2. Il voit son tableau de bord
3. Il sélectionne une séquence
4. Il accède à une séance
5. Il consulte les ressources disponibles

### US-007 : Réalisation d'exercices interactifs
**En tant qu'élève**  
**Je veux faire des exercices**  
**Afin de m'entraîner et d'évaluer mes connaissances**

**Critères d'acceptation :**
- Accéder aux exercices d'une séance
- Répondre aux questions (QCM, texte libre)
- Obtenir une correction automatique
- Voir mes résultats et corrections
- Suivre mes progrès

**Scénario principal :**
1. L'élève sélectionne un exercice
2. Il lit les instructions
3. Il répond aux questions
4. Il soumet ses réponses
5. Il consulte ses résultats

### US-008 : Navigation dans les parcours pédagogiques
**En tant qu'élève**  
**Je veux naviguer facilement dans mes cours**  
**Afin de m'organiser efficacement**

**Critères d'acceptation :**
- Voir l'arborescence des cours
- Naviguer entre séquences et séances
- Marquer les éléments comme lus
- Accéder rapidement aux ressources récentes
- Rechercher des contenus spécifiques

**Scénario principal :**
1. L'élève explore l'arborescence
2. Il navigue vers une séquence
3. Il accède à une séance
4. Il marque le contenu comme consulté
5. Il passe au contenu suivant

## Récits administrateurs

### US-009 : Gestion des utilisateurs
**En tant qu'administrateur**  
**Je veux gérer les comptes utilisateurs**  
**Afin d'assurer la sécurité et l'organisation**

**Critères d'acceptation :**
- Créer des comptes enseignants/élèves
- Modifier les rôles et permissions
- Activer/désactiver des comptes
- Réinitialiser les mots de passe
- Consulter les logs d'activité

**Scénario principal :**
1. L'administrateur accède à la gestion utilisateurs
2. Il crée un nouveau compte enseignant
3. Il définit le rôle et les permissions
4. Il valide la création
5. Il informe l'utilisateur

### US-010 : Supervision pédagogique
**En tant qu'administrateur**  
**Je veux superviser la qualité pédagogique**  
**Afin de maintenir les standards éducatifs**

**Critères d'acceptation :**
- Consulter toutes les progressions
- Vérifier l'alignement avec les programmes
- Valider les objectifs d'apprentissage
- Donner du feedback aux enseignants
- Archiver les contenus obsolètes

**Scénario principal :**
1. L'administrateur liste les progressions
2. Il examine le contenu d'une séquence
3. Il vérifie les objectifs
4. Il identifie des améliorations
5. Il contacte l'enseignant concerné

### US-011 : Configuration système
**En tant qu'administrateur**  
**Je veux configurer les paramètres système**  
**Afin d'adapter la plateforme aux besoins**

**Critères d'acceptation :**
- Configurer les types de ressources
- Gérer les templates IA
- Paramétrer les quotas d'utilisation
- Configurer les paramètres de sécurité
- Mettre à jour les réglages globaux

**Scénario principal :**
1. L'administrateur accède aux paramètres système
2. Il modifie un paramètre (ex: quota IA)
3. Il valide les changements
4. Il vérifie l'application des modifications

## Récits transversaux

### US-012 : Authentification sécurisée
**En tant qu'utilisateur**  
**Je veux me connecter en sécurité**  
**Afin de protéger mes données**

**Critères d'acceptation :**
- Saisir email et mot de passe
- Recevoir un token de session
- Accéder à mes données personnelles
- Me déconnecter proprement
- Réinitialiser mon mot de passe

**Scénario principal :**
1. L'utilisateur saisit ses identifiants
2. Le système valide les credentials
3. Il reçoit un token JWT
4. Il accède à son espace personnel
5. Il peut se déconnecter

### US-013 : Recherche et filtrage
**En tant qu'utilisateur**  
**Je veux rechercher des contenus**  
**Afin de trouver rapidement ce dont j'ai besoin**

**Critères d'acceptation :**
- Rechercher par mots-clés
- Filtrer par type, niveau, matière
- Trier les résultats
- Affiner la recherche
- Sauvegarder les recherches fréquentes

**Scénario principal :**
1. L'utilisateur saisit des termes de recherche
2. Il applique des filtres
3. Il examine les résultats
4. Il affine sa recherche si nécessaire
5. Il accède au contenu trouvé

### US-014 : Export et partage
**En tant qu'enseignant**  
**Je veux exporter mes contenus**  
**Afin de les utiliser hors de la plateforme**

**Critères d'acceptation :**
- Exporter une séquence en PDF
- Télécharger les ressources
- Partager un lien vers une séance
- Imprimer des exercices
- Créer des archives de cours

**Scénario principal :**
1. L'enseignant sélectionne une séquence
2. Il choisit l'option d'export
3. Il configure les paramètres
4. Il lance l'export
5. Il télécharge le fichier généré

## Récits avancés

### US-015 : Personnalisation des templates IA
**En tant qu'enseignant expert**  
**Je veux personnaliser les templates de génération**  
**Afin d'adapter les contenus à ma pédagogie**

**Critères d'acceptation :**
- Modifier les prompts système
- Ajuster les paramètres de génération
- Créer des templates personnalisés
- Tester les nouveaux templates
- Sauvegarder les personnalisations

**Scénario principal :**
1. L'enseignant accède aux paramètres IA
2. Il modifie un prompt existant
3. Il teste la génération
4. Il ajuste les paramètres
5. Il sauvegarde sa configuration

### US-016 : Analyse des performances
**En tant qu'enseignant**  
**Je veux analyser mes résultats pédagogiques**  
**Afin d'ajuster mes méthodes d'enseignement**

**Critères d'acceptation :**
- Consulter les statistiques d'utilisation
- Analyser les résultats aux exercices
- Identifier les points de difficulté
- Recevoir des suggestions d'amélioration
- Comparer avec les moyennes de classe

**Scénario principal :**
1. L'enseignant accède aux statistiques
2. Il sélectionne une période d'analyse
3. Il examine les résultats détaillés
4. Il identifie les axes d'amélioration
5. Il ajuste sa pédagogie

### US-017 : Collaboration temps réel
**En tant qu'équipe pédagogique**  
**Nous voulons collaborer sur une séquence**  
**Afin de créer des contenus de qualité supérieure**

**Critères d'acceptation :**
- Partager une séquence en édition
- Travailler simultanément
- Voir les modifications en temps réel
- Commenter et suggérer des changements
- Valider collectivement les contenus

**Scénario principal :**
1. Un enseignant partage une séquence
2. Les collaborateurs rejoignent la session
3. Ils modifient le contenu ensemble
4. Ils discutent via le chat intégré
5. Ils valident la version finale

## Récits d'erreur et de récupération

### US-018 : Récupération après erreur de génération IA
**En tant qu'enseignant**  
**Je veux récupérer d'une erreur de génération**  
**Afin de ne pas perdre mon travail**

**Critères d'acceptation :**
- Être informé de l'erreur
- Pouvoir relancer la génération
- Récupérer les paramètres précédents
- Sauvegarder partiellement le travail
- Contacter le support si nécessaire

**Scénario principal :**
1. Une génération IA échoue
2. L'enseignant est notifié
3. Il peut relancer avec les mêmes paramètres
4. Il ajuste les paramètres si nécessaire
5. Il réussit la génération

### US-019 : Récupération de données après déconnexion
**En tant qu'utilisateur**  
**Je veux récupérer ma session**  
**Afin de ne pas perdre mon travail en cours**

**Critères d'acceptation :**
- Sauvegarde automatique des brouillons
- Récupération après reconnexion
- Notification des données récupérées
- Possibilité d'ignorer la récupération
- Synchronisation entre appareils

**Scénario principal :**
1. L'utilisateur est déconnecté inopinément
2. Il se reconnecte
3. Le système propose de récupérer le travail
4. Il accepte la récupération
5. Il retrouve son travail en cours

---

*Documentation des récits utilisateur — Comprendre les besoins et attentes des utilisateurs*