#!/usr/bin/env python3
"""
Script de test pour vérifier que la correction de l'association œuvres-séances fonctionne
"""

import sys
import os
from pathlib import Path

# Ajouter le répertoire backend au path
sys.path.insert(0, str(Path(__file__).parent))

def test_oeuvre_association_fix():
    """Test de la correction de l'association œuvres-séances"""

    print("=== TEST DE LA CORRECTION DE L'ASSOCIATION ŒUVRES-SÉANCES ===")
    print("=" * 70)

    from database import SessionLocal
    from models.oeuvre import Oeuvre
    from models.session import Session as SessionModel
    from crud.session import create_session_with_user
    from schemas.session import SessionCreate
    from datetime import datetime

    db = SessionLocal()

    try:
        # 1. Vérifier que les œuvres existent
        print("\n1. VERIFICATION DES ŒUVRES DANS LA BASE")
        print("-" * 40)

        oeuvres = db.query(Oeuvre).filter(Oeuvre.id.in_([22, 23, 24])).all()
        print(f"Œuvres trouvées avec IDs 22, 23, 24: {len(oeuvres)}")

        for oeuvre in oeuvres:
            print(f"  ID {oeuvre.id}: {oeuvre.titre} - {oeuvre.auteur_complet}")

        if len(oeuvres) != 3:
            print("[ERROR] Toutes les œuvres ne sont pas présentes")
            return False

        # 2. Créer une séance de test avec les œuvres
        print("\n2. CREATION D'UNE SEANCE DE TEST AVEC ŒUVRES")
        print("-" * 50)

        # Récupérer le premier utilisateur
        from models.user import User
        user = db.query(User).first()
        if not user:
            print("[ERROR] Aucun utilisateur trouvé")
            return False

        print(f"Utilisateur trouvé: {user.email}")

        # Créer une séance avec les œuvres
        session_data = SessionCreate(
            sequence_id=4,  # Utiliser une séquence existante
            title="Séance de test avec œuvres",
            notes="Test de l'association œuvres-séances",
            date=datetime.now(),
            order=0,
            objective_ids=[1],  # Objectif existant
            resource_ids=[],    # Pas de ressources pour ce test
            oeuvre_ids=[22, 23, 24]  # Les œuvres à associer
        )

        print("Données de la séance à créer:")
        print(f"  Titre: {session_data.title}")
        print(f"  Objectifs: {session_data.objective_ids}")
        print(f"  Œuvres: {session_data.oeuvre_ids}")

        # Créer la séance
        new_session = create_session_with_user(db, session_data, user.id)

        print(f"[OK] Séance créée avec ID: {new_session.id}")

        # 3. Vérifier les associations
        print("\n3. VERIFICATION DES ASSOCIATIONS")
        print("-" * 35)

        # Recharger la séance avec ses relations
        db.refresh(new_session)

        print(f"Objectifs associés: {len(new_session.objectives)}")
        for obj in new_session.objectives:
            print(f"  - {obj.title}")

        print(f"Œuvres associées: {len(new_session.oeuvres)}")
        for oeuvre in new_session.oeuvres:
            print(f"  - ID {oeuvre.id}: {oeuvre.titre}")

        # Vérifier que toutes les œuvres sont associées
        associated_oeuvre_ids = [o.id for o in new_session.oeuvres]
        expected_oeuvre_ids = [22, 23, 24]

        if set(associated_oeuvre_ids) == set(expected_oeuvre_ids):
            print("[OK] Toutes les œuvres sont correctement associées !")
            success = True
        else:
            print(f"[ERROR] Œuvres manquantes. Attendu: {expected_oeuvre_ids}, Trouvé: {associated_oeuvre_ids}")
            success = False

        # 4. Vérifier dans la base de données
        print("\n4. VERIFICATION DANS LA BASE DE DONNEES")
        print("-" * 40)

        # Vérifier la table d'association
        from models.association_tables import session_oeuvre_association
        associations = db.query(session_oeuvre_association).filter(
            session_oeuvre_association.c.session_id == new_session.id
        ).all()

        print(f"Associations trouvées dans session_oeuvre: {len(associations)}")
        for assoc in associations:
            print(f"  Session {assoc.session_id} <-> Oeuvre {assoc.oeuvre_id}")

        if len(associations) == 3:
            print("[OK] Table d'association correctement peuplée")
        else:
            print(f"[ERROR] Nombre d'associations incorrect: {len(associations)} au lieu de 3")
            success = False

        # 5. Nettoyer
        print("\n5. NETTOYAGE")
        print("-" * 15)

        # Supprimer la séance de test
        db.delete(new_session)
        db.commit()
        print("[OK] Séance de test supprimée")

        return success

    except Exception as e:
        print(f"[ERROR] Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print(">>> Test de la correction de l'association œuvres-séances")
    print("=" * 65)

    success = test_oeuvre_association_fix()

    if success:
        print("\n[SUCCESS] CORRECTION REUSSIE !")
        print("L'association œuvres-séances fonctionne maintenant correctement.")
        print("\nLes séances créées incluront désormais leurs œuvres associées.")
        sys.exit(0)
    else:
        print("\n[ERROR] CORRECTION ECHOUEE")
        print("L'association œuvres-séances ne fonctionne toujours pas.")
        sys.exit(1)