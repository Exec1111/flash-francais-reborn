from bs4 import BeautifulSoup
from typing import Dict, Any, List
import re


def _extract_text_and_keywords(texte_html: str) -> (str, List[str]):
    """
    Extrait le texte brut et la liste des mots-clés à partir du HTML de la dictée.
    Les mots-clés sont identifiés par les balises avec la classe 'mot-cle'.
    """
    soup = BeautifulSoup(texte_html or "", "html.parser")

    # Récupérer tous les mots-clés mis en évidence
    mots = []
    for span in soup.find_all(class_="mot-cle"):
        mot = span.get_text(strip=True)
        if mot:
            mots.append(mot)
        # Remplacer par le texte nu pour reconstituer un texte brut
        span.replace_with(mot)

    # Texte brut sans markup
    texte = soup.get_text(" ", strip=True)

    # Dédupliquer en conservant l'ordre
    seen = set()
    mots_uniques = []
    for m in mots:
        if m not in seen:
            seen.add(m)
            mots_uniques.append(m)

    return texte, mots_uniques


def html_to_dictee_json(html: str) -> Dict[str, Any]:
    """
    Transforme un HTML d'édition de dictée en JSON canonique.

    Structure JSON retournée:
    {
      "dictee": {
        "titre": str,
        "texte": str,              # texte sans balises, mots-clés enlevés
        "mots_cles": [str],        # liste extraite depuis <span class="mot-cle">
        "explications": [
          {
            "point": str,
            "explication": str,
            "exemples": [str]
          }
        ]
      }
    }
    """
    soup = BeautifulSoup(html or "", "html.parser")

    # Titre
    titre_el = soup.find(id="dictee-titre") or soup.find(class_="dictee-titre")
    titre = titre_el.get_text(strip=True) if titre_el else ""

    # Corps de texte avec éventuels <span class="mot-cle">
    texte_el = soup.find(id="dictee-texte") or soup.find(class_="dictee-texte")
    texte, mots_cles = _extract_text_and_keywords(str(texte_el)) if texte_el else ("", [])

    # Explications
    explications_container = soup.find(id="explications") or soup.find(class_="explications")
    explications: List[Dict[str, Any]] = []
    if explications_container:
        for item in explications_container.find_all(class_="explication-item"):
            point = (item.find(class_="point-grammatical").get_text(strip=True)
                     if item.find(class_="point-grammatical") else "")
            explication_txt = (item.find(class_="explication-texte").get_text(strip=True)
                               if item.find(class_="explication-texte") else "")
            exemples_list: List[str] = []
            exemples_container = item.find(class_="exemples")
            if exemples_container:
                for ex in exemples_container.find_all(class_="exemple"):
                    t = ex.get_text(strip=True)
                    if t:
                        exemples_list.append(t)
            explications.append({
                "point": point,
                "explication": explication_txt,
                "exemples": exemples_list
            })

    return {
        "dictee": {
            "titre": titre,
            "texte": texte,
            "mots_cles": mots_cles,
            "explications": explications,
        }
    }
