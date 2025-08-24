#!/usr/bin/env python3
"""
Script de test pour vérifier la récupération du contenu des ressources
"""

import sys
import os
from pathlib import Path

# Ajouter le répertoire backend au path
sys.path.insert(0, str(Path(__file__).parent))

from crud.resource import get_resource
from database import SessionLocal

def test_resource_content_retrieval():
    """Test de récupération du contenu d'une ressource"""

    print("*** Test de recuperation du contenu des ressources")
    print("=" * 60)

    # ID de la ressource à tester (celle mentionnée dans les logs: 109)
    resource_id = 109

    try:
        db = SessionLocal()

        print(f"Recherche de la ressource ID: {resource_id}")
        resource = get_resource(db, resource_id=resource_id)

        if not resource:
            print(f"[ERROR] Ressource {resource_id} non trouvee")
            return False

        print("[OK] Ressource trouvee:")
        print(f"   ID: {resource.id}")
        print(f"   Titre: {resource.title}")
        print(f"   Type: {resource.type.key if resource.type else 'N/A'}")
        print(f"   Sous-type: {resource.sub_type.key if resource.sub_type else 'N/A'}")
        print(f"   File path: {resource.file_path}")
        print(f"   Docling MD path: {getattr(resource, 'docling_md_path', 'N/A')}")
        print(f"   Docling chars: {getattr(resource, 'docling_chars', 'N/A')}")

        # Test de récupération du contenu
        content = ""
        upload_dir = os.getenv("UPLOADS_BASE_DIR", "backend/local_uploads")

        # S'assurer que le chemin est absolu
        if not os.path.isabs(upload_dir):
            upload_dir = os.path.join(os.path.dirname(__file__), "..", upload_dir)
            upload_dir = os.path.abspath(upload_dir)
        print(f"Repertoire uploads absolu: {upload_dir}")

        # 1) Essayer d'abord le Markdown Docling
        docling_md_path = getattr(resource, 'docling_md_path', None)
        print(f"Chemin Docling MD: {docling_md_path}")

        if docling_md_path:
            md_abs_path = os.path.join(upload_dir, docling_md_path)
            print(f"Chemin absolu Docling: {md_abs_path}")
            print(f"Fichier Docling existe: {os.path.exists(md_abs_path)}")

            if os.path.exists(md_abs_path):
                with open(md_abs_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                print(f"[OK] Contenu recupere depuis Docling MD: {len(content)} caracteres")
                print(f"Extrait du contenu: {content[:300]}...")

        # 2) Fallback: fichier original
        if not content:
            file_path = resource.file_path
            print(f"Fichier original: {file_path}")

            if file_path:
                file_abs_path = os.path.join(upload_dir, file_path)
                print(f"Chemin absolu fichier: {file_abs_path}")
                print(f"Fichier original existe: {os.path.exists(file_abs_path)}")

                if os.path.exists(file_abs_path):
                    try:
                        with open(file_abs_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        print(f"[OK] Contenu recupere depuis fichier original: {len(content)} caracteres")
                        print(f"Extrait du contenu: {content[:300]}...")
                    except Exception as e:
                        print(f"[ERROR] Impossible de lire le fichier original: {e}")

        if content:
            print("[OK] Test reussi - Contenu recupere avec succes")
            return True
        else:
            print("[ERROR] Test echoue - Aucun contenu trouve")
            return False

    except Exception as e:
        print(f"[ERROR] Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = test_resource_content_retrieval()
    if success:
        print("\n[SUCCESS] Test termine avec succes !")
        sys.exit(0)
    else:
        print("\n[ERROR] Test echoue")
        sys.exit(1)