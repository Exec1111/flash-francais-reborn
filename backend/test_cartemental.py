#!/usr/bin/env python3
"""
Script de test pour valider l'implémentation CARTEMENTAL
"""

import json
import os
import sys
from pathlib import Path

# Ajouter le répertoire backend au path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def test_yaml_config():
    """Teste la configuration YAML"""
    yaml_path = backend_dir / "ai" / "prompts" / "config" / "prompts" / "cartemental.yaml"
    print(f"🔍 Test de la configuration YAML: {yaml_path}")
    
    if not yaml_path.exists():
        print("❌ Fichier YAML non trouvé")
        return False
    
    try:
        import yaml
        with open(yaml_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        # Vérifier les sections requises
        required_sections = ['system_prompt', 'user_prompt_template', 'parameters', 'constraints', 'response_schema']
        for section in required_sections:
            if section not in config:
                print(f"❌ Section manquante: {section}")
                return False
        
        # Vérifier les paramètres
        required_params = ['theme_central', 'profondeur', 'type_contenu', 'niveau_classe']
        param_names = [p['name'] for p in config['parameters']]
        for param in required_params:
            if param not in param_names:
                print(f"❌ Paramètre manquant: {param}")
                return False
        
        print("✅ Configuration YAML valide")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du test YAML: {e}")
        return False

def test_json_schema():
    """Teste le schéma JSON"""
    schema_path = backend_dir / "ai" / "prompts" / "config" / "schemas" / "cartemental.schema.json"
    print(f"🔍 Test du schéma JSON: {schema_path}")
    
    if not schema_path.exists():
        print("❌ Fichier schéma JSON non trouvé")
        return False
    
    try:
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = json.load(f)
        
        # Vérifier la structure du schéma
        if 'properties' not in schema:
            print("❌ Section 'properties' manquante")
            return False
        
        if 'carte' not in schema['properties']:
            print("❌ Section 'carte' manquante")
            return False
        
        carte_props = schema['properties']['carte']['properties']
        required_fields = ['titre', 'theme_central', 'branches', 'consignes_utilisation', 'activites_associees']
        for field in required_fields:
            if field not in carte_props:
                print(f"❌ Champ manquant: {field}")
                return False
        
        print("✅ Schéma JSON valide")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du test JSON: {e}")
        return False

def test_html_template():
    """Teste le template HTML"""
    template_path = backend_dir / "ai" / "template" / "default_lecon_cartemental.html"
    print(f"🔍 Test du template HTML: {template_path}")
    
    if not template_path.exists():
        print("❌ Fichier template HTML non trouvé")
        return False
    
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Vérifier les éléments Jinja2 essentiels
        required_elements = [
            '{{ carte.titre }}',
            '{{ carte.theme_central }}',
            '{% for branch in carte.branches %}',
            '{{ carte.consignes_utilisation }}',
            '{% for activite in carte.activites_associees %}'
        ]
        
        for element in required_elements:
            if element not in html_content:
                print(f"❌ Élément Jinja2 manquant: {element}")
                return False
        
        # Vérifier le CSS moderne
        if 'linear-gradient' not in html_content:
            print("❌ CSS moderne manquant (gradients)")
            return False
        
        print("✅ Template HTML valide")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du test HTML: {e}")
        return False

def test_registry_integration():
    """Teste l'intégration dans le registre"""
    registry_path = backend_dir / "ai" / "services" / "registry.py"
    print(f"🔍 Test de l'intégration registre: {registry_path}")
    
    if not registry_path.exists():
        print("❌ Fichier registre non trouvé")
        return False
    
    try:
        with open(registry_path, 'r', encoding='utf-8') as f:
            registry_content = f.read()
        
        # Vérifier l'entrée dans PROMPT_REGISTRY
        if '("lecon", "cartemental"): "cartemental"' not in registry_content:
            print("❌ Entrée PROMPT_REGISTRY manquante")
            return False
        
        # Vérifier l'entrée dans TEMPLATE_REGISTRY
        if '("lecon", "cartemental"): "default_lecon_cartemental.html"' not in registry_content:
            print("❌ Entrée TEMPLATE_REGISTRY manquante")
            return False
        
        print("✅ Intégration registre valide")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du test registre: {e}")
        return False

def test_database_seeding():
    """Teste l'ajout dans les données de base"""
    init_db_path = backend_dir / "init_db.py"
    print(f"🔍 Test des données de seeding: {init_db_path}")
    
    if not init_db_path.exists():
        print("❌ Fichier init_db.py non trouvé")
        return False
    
    try:
        with open(init_db_path, 'r', encoding='utf-8') as f:
            init_content = f.read()
        
        # Vérifier l'entrée CARTEMENTAL dans les subtypes
        if "'key': 'CARTEMENTAL', 'parent_type_key': 'LECON', 'value': 'Carte mentale'" not in init_content:
            print("❌ Entrée CARTEMENTAL manquante dans init_db.py")
            return False
        
        print("✅ Données de seeding valides")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du test seeding: {e}")
        return False

def create_sample_data():
    """Crée un échantillon de données pour tester le rendu"""
    print("🔍 Création d'un échantillon de données de test")
    
    sample_data = {
        "carte": {
            "titre": "Les Figures de Style en Français",
            "theme_central": "Figures de Style",
            "branches": [
                {
                    "titre": "Figures d'analogie",
                    "couleur": "#FF6B6B",
                    "sous_branches": [
                        {
                            "titre": "Comparaison",
                            "elements": [
                                "Utilise un outil de comparaison",
                                "Ex: fort comme un lion",
                                "Structure: comparé + outil + comparant"
                            ]
                        },
                        {
                            "titre": "Métaphore",
                            "elements": [
                                "Comparaison sans outil",
                                "Ex: la vie est un théâtre",
                                "Substitution directe"
                            ]
                        }
                    ]
                },
                {
                    "titre": "Figures d'opposition",
                    "couleur": "#4ECDC4",
                    "sous_branches": [
                        {
                            "titre": "Antithèse",
                            "elements": [
                                "Opposition de deux idées",
                                "Ex: Il fait beau, il fait laid",
                                "Contraste saisissant"
                            ]
                        }
                    ]
                },
                {
                    "titre": "Figures d'insistance",
                    "couleur": "#45B7D1",
                    "sous_branches": [
                        {
                            "titre": "Répétition",
                            "elements": [
                                "Reprendre un même terme",
                                "Ex: Toujours, toujours",
                                "Effet d'intensité"
                            ]
                        }
                    ]
                }
            ],
            "consignes_utilisation": "Cliquez sur chaque branche pour découvrir les sous-catégories et leurs exemples. Utilisez cette carte pour réviser et mémoriser les différents types de figures de style.",
            "activites_associees": [
                "Créer des phrases avec chaque figure étudiée",
                "Identifier les figures dans un texte littéraire",
                "Jouer au jeu des définitions avec un camarade",
                "Rédiger un texte en utilisant au moins 3 figures différentes"
            ]
        }
    }
    
    # Sauvegarder l'échantillon
    sample_path = backend_dir / "test_cartemental_sample.json"
    with open(sample_path, 'w', encoding='utf-8') as f:
        json.dump(sample_data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Échantillon créé: {sample_path}")
    return True

def main():
    """Fonction principale de test"""
    print("🚀 Tests d'implémentation CARTEMENTAL")
    print("=" * 50)
    
    tests = [
        ("Configuration YAML", test_yaml_config),
        ("Schéma JSON", test_json_schema),  
        ("Template HTML", test_html_template),
        ("Intégration registre", test_registry_integration),
        ("Données de seeding", test_database_seeding),
        ("Échantillon de données", create_sample_data)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}")
        result = test_func()
        results.append(result)
    
    print("\n" + "=" * 50)
    print("📊 RÉSULTATS DES TESTS")
    print("=" * 50)
    
    success_count = sum(results)
    total_count = len(results)
    
    for i, (test_name, _) in enumerate(tests):
        status = "✅ RÉUSSI" if results[i] else "❌ ÉCHEC"
        print(f"{test_name}: {status}")
    
    print(f"\n🎯 Score: {success_count}/{total_count}")
    
    if success_count == total_count:
        print("🎉 Tous les tests sont réussis! CARTEMENTAL est prêt à être utilisé.")
        return True
    else:
        print(f"⚠️  {total_count - success_count} test(s) ont échoué. Vérifiez les erreurs ci-dessus.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)