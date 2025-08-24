#!/usr/bin/env python3
"""
Script pour peupler la base de données avec des œuvres de test
"""

import os
from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal
from models.oeuvre import Oeuvre
from models.user import User
from datetime import datetime

def create_test_oeuvres():
    """Crée des œuvres de test avec les IDs attendus par l'IA"""

    db = SessionLocal()

    try:
        # Recuperer le premier utilisateur (enseignant)
        user = db.query(User).first()
        if not user:
            print("Aucun utilisateur trouve. Veuillez d'abord creer des utilisateurs.")
            return

        print(f"Creation des oeuvres pour l'utilisateur: {user.email}")

        # Oeuvres de test avec les IDs attendus par l'IA
        oeuvres_data = [
            {
                "id": 22,
                "titre": "La Peur",
                "auteur": {
                    "nom": "Maupassant",
                    "prenom": "Guy de",
                    "nationalite": "Française"
                },
                "type": "nouvelle",
                "genre": "Fantastique, psychologique",
                "date_publication": 1882,
                "extrait": False,
                "mouvement_litteraire": "Réalisme, Naturalisme (avec des incursions dans le fantastique)",
                "langue_originale": "Français",
                "contenu": {
                    "resume": "Dans cette nouvelle, le narrateur raconte une soirée à bord d'un navire où des hommes discutent de la peur. Un vieux général raconte une expérience terrifiante vécue en Algérie, face à des Bédouins qu'il ne pouvait pas voir, seulement entendre et sentir leur présence, provoquant une peur panique. Un homme plus jeune prend ensuite la parole pour décrire sa propre expérience de la peur absolue lors d'une tempête en mer, où il fut le seul survivant d'un naufrage. Cependant, le narrateur réfute ces expériences, arguant qu'elles ne sont que des manifestations de l'instinct de conservation. Il conclut en racontant une nuit passée dans une maison hantée en Bretagne, où la peur, cette fois sans cause logique apparente, s'est emparée de lui de manière inexplicable, remettant en question la nature même de cette émotion et la frontière entre le réel et l'irréel.",
                    "themes": ["La peur et ses manifestations", "Le surnaturel et l'irrationnel", "La perception et la réalité", "La mort et la survie", "La psychologie humaine face à l'inconnu", "Le récit et la subjectivité"],
                    "mots_cles": ["Maupassant", "nouvelle", "fantastique", "peur", "psychologie", "surnaturel", "XIXe siècle", "récit cadre", "incertitude", "réel"]
                },
                "pedagogie": {
                    "niveau_mini_recommande": "3e",
                    "domaines_programme": ["Questionner le réel", "Imaginer des mondes", "Héros, héroïnes et personnages", "La littérature pour interroger le monde", "Les formes de l'imaginaire"],
                    "difficulte": "intermédiaire"
                },
                "tags": ["Peur", "fantastique", "nouvelle", "Maupassant", "XIXe siècle", "irréel", "perception", "psychologie", "suggestion_ia"]
            },
            {
                "id": 23,
                "titre": "L'Étrange Cas du Dr Jekyll et de Mr Hyde",
                "auteur": {
                    "nom": "Stevenson",
                    "prenom": "Robert Louis",
                    "nationalite": "Britannique"
                },
                "type": "roman",
                "genre": "Fantastique",
                "date_publication": 1886,
                "extrait": True,
                "mouvement_litteraire": "Littérature victorienne",
                "langue_originale": "Anglais",
                "contenu": {
                    "resume": "L'histoire se déroule à Londres et suit les investigations de M. Utterson, un notaire, qui s'inquiète des agissements mystérieux de son ami, le respectable Dr Henry Jekyll. Ce dernier semble étrangement lié à un homme repoussant et violent, Mr Edward Hyde, impliqué dans des actes criminels. Au fur et à mesure de l'enquête, Utterson découvre les termes d'un étrange testament de Jekyll en faveur de Hyde, et perçoit que leur relation cache un secret terrifiant. L'œuvre explore la dualité de la nature humaine et les dangers de la science quand elle cherche à séparer le bien du mal.",
                    "themes": ["Dualité de l'être humain", "Bien et Mal", "Science et éthique", "Apparence et réalité", "Identité", "Secret"],
                    "mots_cles": ["Dédoublement", "Expérience scientifique", "Mystère", "Londres", "Époque victorienne", "Horreur", "Transformation", "Morale", "Identité"]
                },
                "pedagogie": {
                    "niveau_mini_recommande": "3e",
                    "domaines_programme": ["Regarder le monde, inventer des mondes", "Vivre en société, participer à la société"],
                    "difficulte": "intermédiaire"
                },
                "tags": ["Dédoublement", "Fantastique", "Londres", "XIXe siècle", "Roman gothique", "Écossais", "Mythe moderne", "suggestion_ia"]
            },
            {
                "id": 24,
                "titre": "Le Horla",
                "auteur": {
                    "nom": "Maupassant",
                    "prenom": "Guy de",
                    "nationalite": "Française"
                },
                "type": "nouvelle",
                "genre": "fantastique",
                "date_publication": 1887,
                "extrait": False,
                "mouvement_litteraire": "Réalisme et Naturalisme (avec une incursion dans le fantastique)",
                "langue_originale": "Français",
                "contenu": {
                    "resume": 'La nouvelle "Le Horla" narre le journal intime d\'un homme de la haute société qui ressent une présence invisible et oppressive autour de lui. Progressivement, cette entité qu\'il nomme le Horla, un être supérieur et invisible qui se nourrit de sa vitalité et prend possession de son esprit, le pousse aux confins de la folie. Le narrateur tente désespérément de comprendre, de combattre puis d\'anéantir cette force mystérieuse qui remet en question toute sa perception de la réalité et de l\'existence.',
                    "themes": ["La folie", "L'invisible", "La peur", "La perception du réel", "L'altérité", "Le doute", "Le surnaturel", "La solitude"],
                    "mots_cles": ["Maupassant", "Horla", "fantastique", "nouvelle", "19e siècle", "folie", "surnaturel", "angoisse", "réalité", "invisible"]
                },
                "pedagogie": {
                    "niveau_mini_recommande": "3e",
                    "domaines_programme": ["La fiction pour interroger le réel", "Se chercher, se construire", "Vivre en société, participer à la société"],
                    "difficulte": "intermédiaire"
                },
                "tags": ["Maupassant", "19ème siècle", "fantastique", "nouvelle", "folie", "questionnement", "psychologie", "surnaturel", "suggestion_ia"]
            }
        ]

        # Créer les œuvres
        for oeuvre_data in oeuvres_data:
            # Verifier si l'oeuvre existe deja
            existing_oeuvre = db.query(Oeuvre).filter(Oeuvre.id == oeuvre_data["id"]).first()
            if existing_oeuvre:
                print(f"Oeuvre ID {oeuvre_data['id']} existe deja, mise a jour...")
                # Mettre a jour les champs
                for key, value in oeuvre_data.items():
                    if key != "id":
                        setattr(existing_oeuvre, key, value)
                existing_oeuvre.user_id = user.id
                existing_oeuvre.updated_at = datetime.utcnow()
            else:
                print(f"Creation de l'oeuvre ID {oeuvre_data['id']}: {oeuvre_data['titre']}")
                oeuvre = Oeuvre(**oeuvre_data, user_id=user.id)
                db.add(oeuvre)

        db.commit()
        print("[OK] Oeuvres creees/mises a jour avec succes !")

        # Verifier les oeuvres creees
        oeuvres = db.query(Oeuvre).all()
        print(f"\n[BOOKS] Oeuvres dans la base de donnees ({len(oeuvres)} total) :")
        for oeuvre in oeuvres:
            print(f"  ID: {oeuvre.id} - {oeuvre.titre} ({oeuvre.auteur_complet})")

    except Exception as e:
        print(f"[ERROR] Erreur lors de la creation des oeuvres: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print(">>> Creation des oeuvres de test...")
    create_test_oeuvres()
    print("[OK] Script termine !")