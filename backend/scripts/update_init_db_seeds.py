import os
import re
import sys
import pprint
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session

# Ajuster le PYTHONPATH pour importer les modules du répertoire parent (backend)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.append(PARENT_DIR)

# Charger les variables d'environnement
load_dotenv(os.path.join(PARENT_DIR, '.env')) # Cherche .env dans le dossier backend

from models.resource import ResourceType, ResourceSubType
from database import Base # Utilisé pour créer l'engine si besoin, mais SessionLocal est mieux

# Configuration de la base de données
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    print("Erreur: La variable d'environnement DATABASE_URL n'est pas définie.")
    print(f"Assurez-vous d'avoir un fichier .env dans le dossier '{PARENT_DIR}' ou que la variable est définie.")
    sys.exit(1)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

INIT_DB_PATH = os.path.join(PARENT_DIR, "init_db.py")

def fetch_resource_types(db_session):
    """Récupère et formate les ResourceType depuis la base de données."""
    print("Lecture des ResourceType depuis la base de données...")
    types = db_session.query(ResourceType).order_by(ResourceType.id).all()
    seeded_types = []
    for rt_type in types:
        seeded_types.append({"key": rt_type.key, "value": rt_type.value})
    print(f"{len(seeded_types)} ResourceType trouvés.")
    return seeded_types

def fetch_resource_subtypes(db_session):
    """Récupère et formate les ResourceSubType depuis la base de données."""
    print("Lecture des ResourceSubType depuis la base de données...")
    subtypes = db_session.query(ResourceSubType).join(ResourceType).order_by(ResourceSubType.type_id, ResourceSubType.id).all()
    seeded_subtypes = []
    for subtype in subtypes:
        seeded_subtypes.append({
            "key": subtype.key,
            "parent_type_key": subtype.type.key, # Accès à la clé du parent via la relation
            "value": subtype.value
        })
    print(f"{len(seeded_subtypes)} ResourceSubType trouvés.")
    return seeded_subtypes

def update_init_db_file(new_types_data, new_subtypes_data):
    """Met à jour le fichier init_db.py avec les nouvelles données de seed."""
    print(f"Lecture du fichier {INIT_DB_PATH}...")
    try:
        with open(INIT_DB_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Erreur : Le fichier {INIT_DB_PATH} n'a pas été trouvé.")
        return False

    # Formater les listes de données en chaînes Python bien indentées
    # L'indentation de 4 espaces après la nouvelle ligne et pour chaque item est cruciale
    types_str = pprint.pformat(new_types_data, indent=4, width=100)
    subtypes_str = pprint.pformat(new_subtypes_data, indent=4, width=100)

    # Remplacement pour ResourceType
    # Attention aux caractères spéciaux dans les commentaires pour le regex
    # On capture ce qui est avant et après la liste pour le réinsérer
    # re.DOTALL permet à '.' de matcher les nouvelles lignes
    type_pattern = re.compile(
        r"(# ===============================================================\n    # == MODIFIER ICI : Données initiales pour ResourceType ==\n    # ===============================================================\n    resource_types_to_seed = )(\[.*?\])(\s*# ===============================================================)",
        re.DOTALL
    )
    
    # Remplacement pour ResourceSubType
    subtype_pattern = re.compile(
        r"(# ===============================================================\n    # == MODIFIER ICI : Données initiales pour ResourceSubType ==\n    # ===============================================================\n    resource_subtypes_to_seed = )(\[.*?\])(\s*# ===============================================================)",
        re.DOTALL
    )

    # Appliquer les remplacements
    new_content = type_pattern.sub(lambda m: f"{m.group(1)}{types_str}{m.group(3)}", content)
    if new_content == content: # Vérifier si le premier remplacement a eu lieu
        print("AVERTISSEMENT : Le pattern pour resource_types_to_seed n'a pas été trouvé ou n'a rien modifié.")
        print("Vérifiez les commentaires délimiteurs dans init_db.py.")
    
    # Appliquer le second remplacement sur le contenu déjà modifié par le premier
    final_content = subtype_pattern.sub(lambda m: f"{m.group(1)}{subtypes_str}{m.group(3)}", new_content)
    if final_content == new_content and new_content != content: # Si le 1er a marché mais pas le 2nd
        print("AVERTISSEMENT : Le pattern pour resource_subtypes_to_seed n'a pas été trouvé ou n'a rien modifié.")
        print("Vérifiez les commentaires délimiteurs dans init_db.py.")
    elif final_content == content: # Si aucun des deux n'a fonctionné
        print("AVERTISSEMENT : Aucun des patterns (types ou sous-types) n'a modifié le fichier.")

    if final_content != content:
        print(f"Modifications prêtes à être écrites dans {INIT_DB_PATH}.")
        confirm = input("Voulez-vous écrire ces modifications dans le fichier ? (oui/non): ")
        if confirm.lower() == 'oui':
            try:
                with open(INIT_DB_PATH, 'w', encoding='utf-8') as f:
                    f.write(final_content)
                print(f"Le fichier {INIT_DB_PATH} a été mis à jour avec succès.")
                return True
            except Exception as e:
                print(f"Erreur lors de l'écriture dans {INIT_DB_PATH}: {e}")
                return False
        else:
            print("Modifications annulées par l'utilisateur.")
            return False
    else:
        print("Aucune modification à apporter au fichier init_db.py (le contenu généré est identique ou les patterns n'ont pas matché).")
        return False

def main():
    db_session = scoped_session(SessionLocal)
    try:
        types_data = fetch_resource_types(db_session)
        subtypes_data = fetch_resource_subtypes(db_session)
        
        if not types_data and not subtypes_data:
            print("Aucune donnée de type ou sous-type n'a été récupérée de la base de données. Vérifiez la connexion et le contenu des tables.")
            return

        update_init_db_file(types_data, subtypes_data)

    finally:
        db_session.remove()

if __name__ == "__main__":
    print("Script de mise à jour des données de seed pour init_db.py")
    print("---------------------------------------------------------")
    main()
    print("---------------------------------------------------------")
    print("Script terminé.")
