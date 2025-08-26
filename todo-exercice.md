# TODO - Nouveaux Types d'Exercices et Leçons

Ce fichier liste 10 idées d'exercices et types de leçons à intégrer dans l'application Flash Français Reborn. Chaque entrée suit le format standardisé pour faciliter l'implémentation (triplet YAML/JSON/HTML).
---
## 3. LECON - CARTEMENTAL

### Description
Propose une carte mentale pour maitriser un sujet ou une notion spécifique afin de faciliter l'apprentissage et la mémorisation de l'élève.

### But pédagogique
- Développer l'organisation des idées
- Favoriser la mémorisation visuelle
- Structurer la réflexion
- Préparer des analyses ou exposés

### Paramètres d'entrée
- `theme_central`: Sujet principal de la carte
- `profondeur`: Niveau de détail souhaité
- `type_contenu`: vocabulaire, analyse_oeuvre, grammaire, culture
- `niveau_classe`: Niveau des apprenants (enum: [6ème faible, 6ème, 6ème élevé, 5ème faible, 5ème, 5ème élevé, 4ème faible, 4ème, 4ème élevé, 3ème faible, 3ème, 3ème élevé])
- `resource_ids`: Liste d'identifiants de ressources à utiliser comme base pour l'exercice (optionnel)
- `instructions_personnalisees`: Instructions personnalisées pour la génération de l'exercice (optionnel)

### Structure de sortie JSON
```json
{
  "carte": {
    "titre": "string",
    "theme_central": "string",
    "branches": [{"titre": "string", "couleur": "string", "sous_branches": [{"titre": "string", "elements": ["string"]}]}],
    "consignes_utilisation": "string",
    "activites_associees": ["string"]
  }
}
```

### Registre
- **Type**: lecon
- **Sous-type**: cartemental
- **Template**: default_lecon_cartemental.html

---

## 4. EXERCICE - DEBATSTRUCTURE

### Description
Structure de débat avec rôles définis, arguments pro/contra et modération pour développer l'expression orale et l'argumentation.

### But pédagogique
- Développer l'argumentation orale
- Apprendre à écouter et réfuter
- Structurer la prise de parole
- Développer l'esprit critique

### Paramètres d'entrée
- `sujet_debat`: Question à débattre
- `nombre_participants`: Nombre d'élèves participants
- `duree_estimee`: Durée prévue du débat
- `type_debat`: classique, tribunal, table_ronde
- `niveau_classe`: Niveau des apprenants (enum: [6ème faible, 6ème, 6ème élevé, 5ème faible, 5ème, 5ème élevé, 4ème faible, 4ème, 4ème élevé, 3ème faible, 3ème, 3ème élevé])
- `resource_ids`: Liste d'identifiants de ressources à utiliser comme base pour l'exercice (optionnel)
- `instructions_personnalisees`: Instructions personnalisées pour la génération de l'exercice (optionnel)

### Structure de sortie JSON
```json
{
  "debat": {
    "titre": "string",
    "problematique": "string",
    "roles": [{"nom": "string", "description": "string", "arguments_cles": ["string"]}],
    "deroulement": [{"etape": "string", "duree": "string", "description": "string"}],
    "arguments_pour": ["string"],
    "arguments_contre": ["string"],
    "questions_relance": ["string"],
    "grille_evaluation": {"criteres": ["string"], "baremes": ["string"]}
  }
}
```

### Registre
- **Type**: exercice
- **Sous-type**: debatstructure
- **Template**: default_exercice_debatstructure.html

---

## 5. LECON - PARCOURSCULTUREL

### Description
Parcours culturel thématique reliant littérature, histoire, arts et société sur une période ou un mouvement précis.

### But pédagogique
- Développer la culture générale
- Créer des liens interdisciplinaires
- Contextualiser les œuvres littéraires
- Enrichir la compréhension historique

### Paramètres d'entrée
- `periode_historique`: Époque ou mouvement étudié
- `theme_transversal`: Thème fédérateur
- `focus_geographique`: Zone géographique (France, Europe, monde)
- `disciplines_integrees`: Matières à intégrer
- `niveau_classe`: Niveau des apprenants (enum: [6ème faible, 6ème, 6ème élevé, 5ème faible, 5ème, 5ème élevé, 4ème faible, 4ème, 4ème élevé, 3ème faible, 3ème, 3ème élevé])
- `resource_ids`: Liste d'identifiants de ressources à utiliser comme base pour la leçon (optionnel)
- `instructions_personnalisees`: Instructions personnalisées pour la génération de l'exercice (optionnel)

### Structure de sortie JSON
```json
{
  "parcours": {
    "titre": "string",
    "periode": "string",
    "introduction": "string",
    "etapes": [{"titre": "string", "discipline": "string", "contenu": "string", "oeuvres_cles": ["string"], "dates_importantes": ["string"]}],
    "synthese": "string",
    "activites_prolongement": ["string"],
    "ressources_multimedia": [{"type": "string", "titre": "string", "description": "string"}]
  }
}
```

### Registre
- **Type**: lecon
- **Sous-type**: parcoursculturel
- **Template**: default_lecon_parcoursculturel.html

---

## 6. EXERCICE - JEUCORRESPONDANCES

### Description
Jeu interactif de correspondances entre différents éléments (auteurs/œuvres, mots/définitions, citations/contextes, etc.).

### But pédagogique
- Mémoriser des associations importantes
- Réviser de façon ludique
- Développer les réflexes culturels
- Consolider les apprentissages

### Paramètres d'entrée
- `type_correspondance`: auteur_oeuvre, mot_definition, citation_auteur, periode_caracteristique
- `theme`: Domaine d'étude
- `nombre_paires`: Nombre d'associations à créer
- `difficulte`: facile, moyen, difficile
- `niveau_classe`: Niveau des apprenants (enum: [6ème faible, 6ème, 6ème élevé, 5ème faible, 5ème, 5ème élevé, 4ème faible, 4ème, 4ème élevé, 3ème faible, 3ème, 3ème élevé])
- `resource_ids`: Liste d'identifiants de ressources à utiliser comme base pour l'exercice (optionnel)
- `instructions_personnalisees`: Instructions personnalisées pour la génération de l'exercice (optionnel)

### Structure de sortie JSON
```json
{
  "jeu": {
    "titre": "string",
    "consigne": "string",
    "paires_correctes": [{"element1": "string", "element2": "string", "explication": "string"}],
    "distracteurs": ["string"],
    "indices": ["string"],
    "score_max": number,
    "temps_suggere": "string"
  }
}
```

### Registre
- **Type**: exercice
- **Sous-type**: jeucorrespondances
- **Template**: default_exercice_jeucorrespondances.html

---

## 7. LECON - ATELIER_ECRITURE

### Description
Guide d'atelier d'écriture créative avec contraintes, techniques et exercices progressifs pour développer l'expression écrite.

### But pédagogique
- Libérer la créativité écrite
- Maîtriser différentes techniques narratives
- Expérimenter les genres littéraires
- Développer le style personnel

### Paramètres d'entrée
- `type_ecriture`: nouvelle, poesie, theatre, autobiographie, fiction
- `contrainte_principale`: Contrainte d'écriture principale
- `duree_atelier`: Durée prévue
- `objectif_final`: Production attendue
- `niveau_classe`: Niveau des apprenants (enum: [6ème faible, 6ème, 6ème élevé, 5ème faible, 5ème, 5ème élevé, 4ème faible, 4ème, 4ème élevé, 3ème faible, 3ème, 3ème élevé])
- `resource_ids`: Liste d'identifiants de ressources à utiliser comme base pour la leçon (optionnel)
- `instructions_personnalisees`: Instructions personnalisées pour la génération de l'exercice (optionnel)

### Structure de sortie JSON
```json
{
  "atelier": {
    "titre": "string",
    "objectif": "string",
    "echauffements": [{"titre": "string", "duree": "string", "consigne": "string"}],
    "exercices_progressifs": [{"niveau": number, "titre": "string", "contrainte": "string", "exemple": "string"}],
    "techniques_enseignees": [{"nom": "string", "definition": "string", "application": "string"}],
    "projet_final": {"description": "string", "criteres_evaluation": ["string"]},
    "inspirations": [{"auteur": "string", "oeuvre": "string", "extrait": "string"}]
  }
}
```

### Registre
- **Type**: lecon
- **Sous-type**: atelier_ecriture
- **Template**: default_lecon_atelier_ecriture.html

---

## 8. EXERCICE - ANALYSERHYTHME

### Description
Exercice d'analyse du rythme et de la musicalité dans un texte poétique ou en prose, avec outils de scansion et d'analyse sonore.

### But pédagogique
- Développer la sensibilité poétique
- Comprendre la versification française
- Analyser les effets de rythme
- Améliorer la diction et l'expression orale

### Paramètres d'entrée
- `texte_type`: poesie_classique, poesie_moderne, prose_poetique, theatre
- `niveau_analyse`: syllabique, metrique, rythmique, sonore
- `focus_technique`: Aspect technique à privilégier
- `support_audio`: Inclusion d'éléments audio
- `niveau_classe`: Niveau des apprenants (enum: [6ème faible, 6ème, 6ème élevé, 5ème faible, 5ème, 5ème élevé, 4ème faible, 4ème, 4ème élevé, 3ème faible, 3ème, 3ème élevé])
- `resource_ids`: Liste d'identifiants de ressources à utiliser comme base pour l'exercice (optionnel)
- `instructions_personnalisees`: Instructions personnalisées pour la génération de l'exercice (optionnel)

### Structure de sortie JSON
```json
{
  "analyse": {
    "titre": "string",
    "texte_etudie": {"auteur": "string", "titre": "string", "extrait": "string"},
    "schema_rythmique": "string",
    "scansion": [{"vers": "string", "decoupe": "string", "pieds": number}],
    "effets_sonores": [{"type": "string", "exemples": ["string"], "effet_produit": "string"}],
    "exercices_pratiques": [{"consigne": "string", "support": "string"}],
    "prolongements": ["string"]
  }
}
```

### Registre
- **Type**: exercice
- **Sous-type**: analyserhythme
- **Template**: default_exercice_analyserhythme.html

---

## 9. LECON - DECRYPTAGE_MEDIA

### Description
Leçon d'éducation aux médias pour analyser et décrypter différents types de contenus médiatiques (presse, publicité, réseaux sociaux).

### But pédagogique
- Développer l'esprit critique face aux médias
- Identifier les techniques de manipulation
- Comprendre les codes médiatiques
- Former des citoyens éclairés

### Paramètres d'entrée
- `type_media`: presse_ecrite, television, radio, reseaux_sociaux, publicite
- `angle_analyse`: information, opinion, manipulation, esthetique
- `actualite_reference`: Événement d'actualité à analyser
- `competences_ciblees`: Compétences spécifiques à développer
- `niveau_classe`: Niveau des apprenants (enum: [6ème faible, 6ème, 6ème élevé, 5ème faible, 5ème, 5ème élevé, 4ème faible, 4ème, 4ème élevé, 3ème faible, 3ème, 3ème élevé])
- `resource_ids`: Liste d'identifiants de ressources à utiliser comme base pour la leçon (optionnel)
- `instructions_personnalisees`: Instructions personnalisées pour la génération de l'exercice (optionnel)

### Structure de sortie JSON
```json
{
  "decryptage": {
    "titre": "string",
    "media_etudie": {"type": "string", "source": "string", "description": "string"},
    "grille_analyse": [{"critere": "string", "questions": ["string"], "indicateurs": ["string"]}],
    "techniques_reperees": [{"nom": "string", "definition": "string", "exemple": "string"}],
    "exercices_application": [{"titre": "string", "consigne": "string", "support": "string"}],
    "synthese_citoyenne": "string",
    "ressources_verification": ["string"]
  }
}
```

### Registre
- **Type**: lecon
- **Sous-type**: decryptage_media
- **Template**: default_lecon_decryptage_media.html

---

## 10. EXERCICE - TIMELINE_INTERACTIVE

### Description
Création d'une frise chronologique interactive pour situer œuvres, auteurs, mouvements littéraires et événements historiques.

### But pédagogique
- Développer la chronologie littéraire
- Contextualiser les œuvres
- Visualiser les influences et évolutions
- Mémoriser les repères temporels

### Paramètres d'entrée
- `periode_couverte`: Période historique à couvrir
- `focus_thematique`: Thème principal (mouvement, genre, région)
- `granularite`: siècle, décennie, année
- `elements_inclus`: Types d'éléments à placer
- `niveau_classe`: Niveau des apprenants (enum: [6ème faible, 6ème, 6ème élevé, 5ème faible, 5ème, 5ème élevé, 4ème faible, 4ème, 4ème élevé, 3ème faible, 3ème, 3ème élevé])
- `resource_ids`: Liste d'identifiants de ressources à utiliser comme base pour l'exercice (optionnel)
- `instructions_personnalisees`: Instructions personnalisées pour la génération de l'exercice (optionnel)

### Structure de sortie JSON
```json
{
  "timeline": {
    "titre": "string",
    "periode": {"debut": "string", "fin": "string"},
    "evenements": [{"date": "string", "titre": "string", "description": "string", "type": "string", "importance": number}],
    "periodes_cles": [{"nom": "string", "debut": "string", "fin": "string", "caracteristiques": ["string"]}],
    "personnages_majeurs": [{"nom": "string", "dates": "string", "role": "string", "oeuvres_cles": ["string"]}],
    "activites_interactives": [{"type": "string", "consigne": "string"}],
    "quiz_chronologique": [{"question": "string", "reponses": ["string"], "bonne_reponse": number}]
  }
}
```

### Registre
- **Type**: exercice
- **Sous-type**: timeline_interactive
- **Template**: default_exercice_timeline_interactive.html

---

## Instructions d'Implémentation

Pour chaque exercice, suivre cette procédure :

1. **Créer le fichier YAML** : `backend/ai/prompts/config/prompts/{sous-type}.yaml`
2. **Créer le schéma JSON** : `backend/ai/prompts/config/schemas/{sous-type}.schema.json`
3. **Créer le template HTML** : `backend/ai/template/default_{type}_{sous-type}.html`
4. **Mettre à jour le registre** : Ajouter les entrées dans `backend/ai/services/registry.py`
5. **Mettre à jour la base** : Ajouter le sous-type dans `backend/init_db.py`
6. **Tester l'implémentation** : Créer un script de test et valider le fonctionnement

### Format de Commit Recommandé
```
feat: add {TYPE}_{SUBTYPE} exercise type

- Add YAML prompt configuration
- Add JSON schema validation
- Add HTML template with responsive design
- Update registry and database schema
- Include comprehensive testing
```

### Priorités Suggérées
1. **TEXTERECONSTITUE** - Exercice ludique et utile
2. **FICHEMETHODE** - Leçon très demandée par les enseignants
3. **CARTEMENTAL** - Outil de structuration populaire
4. **DEBATSTRUCTURE** - Développement de l'oral
5. **TIMELINE_INTERACTIVE** - Visualisation chronologique

---

*Dernière mise à jour : 25 août 2025*