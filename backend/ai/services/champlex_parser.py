import json
import re
from bs4 import BeautifulSoup
from typing import Any, Dict, List, Optional


def _extract_json_from_script(html: str) -> Optional[Dict[str, Any]]:
    """
    Tente d'extraire un objet JSON depuis une déclaration JS de type:
      const donnees = { ... };
    ou
      var donnees = { ... };
    Retourne un dict Python si succès, sinon None.
    """
    try:
        # Rechercher un bloc donnees = {...}; de manière robuste (multilignes)
        # 1) Recherche classique: const/var/let donnees = {...};
        m = re.search(r"(?:const|var|let)\s+donnees\s*=\s*(\{[\s\S]*?\});", html, re.I)
        if not m:
            # 2) Recherche plus large: toute affectation à un identifiant se terminant par = { ... };
            m = re.search(r"(?:const|var|let)\s+[a-zA-Z0-9_]+\s*=\s*(\{[\s\S]*?\});", html, re.I)
        if not m:
            # 3) Dernier recours: extraire un objet qui contient \"champs\" : [ ... ]
            obj_text = _extract_object_containing_champs(html)
            if obj_text:
                return _safe_json_loads(obj_text)
            return None
        obj_text = m.group(1)
        return _safe_json_loads(obj_text)
    except Exception:
        return None

def _safe_json_loads(obj_text: str) -> Optional[Dict[str, Any]]:
    """Essaye de charger un objet JSON à partir d'un littéral JS approximatif."""
    try:
        return json.loads(obj_text)
    except json.JSONDecodeError:
        try:
            normalized = obj_text
            # Supprimer commentaires JS éventuels
            normalized = re.sub(r"/\*.*?\*/", "", normalized, flags=re.S)
            normalized = re.sub(r"//.*?$", "", normalized, flags=re.M)
            # Enlever trailing commas (,,) dans objets/tableaux
            normalized = re.sub(r",\s*([}\]])", r"\1", normalized)
            # Remplacer quotes simples par doubles
            normalized = normalized.replace("'", '"')
            return json.loads(normalized)
        except Exception:
            return None

def _extract_object_containing_champs(html: str) -> Optional[str]:
    """Trouve un bloc d'accolades englobant contenant la clé "champs" et retourne le texte de l'objet."""
    idx = html.find('"champs"')
    if idx == -1:
        idx = html.find("'champs'")
    if idx == -1:
        return None
    # Chercher l'accolade ouvrante la plus proche vers la gauche
    start = None
    brace_count = 0
    for i in range(idx, -1, -1):
        if html[i] == '{':
            start = i
            break
    if start is None:
        return None
    # Parcourir vers la droite en équilibrant les accolades
    for j in range(start, len(html)):
        ch = html[j]
        if ch == '{':
            brace_count += 1
        elif ch == '}':
            brace_count -= 1
            if brace_count == 0:
                return html[start:j+1]
    return None

def html_to_champlex_json(html: str) -> Dict[str, Any]:
    """
    Parse un HTML d'édition Champlex et produit le JSON canonique suivant:
    {
      "champs": [
         {"name": "la peur", "words": ["frisson", "trembler", ...]},
         ...
      ]
    }
    Stratégie:
    - Priorité: extraire depuis le script 'const donnees = {...};'
    - Fallback: si introuvable, essayer de lire la structure DOM (non garanti ici)
    """
    soup = BeautifulSoup(html or "", "html.parser")

    # 1) Essayer d'extraire le JSON depuis un script
    raw = _extract_json_from_script(html or "")
    title_from_html = None
    desc_from_html = None
    try:
        h1 = soup.find('h1')
        if h1:
            title_from_html = h1.get_text(strip=True)
        p = soup.find('p')
        if p:
            desc_from_html = p.get_text(strip=True)
    except Exception:
        pass

    if isinstance(raw, dict):
        # Plusieurs variantes possibles: soit {"champs": [...]}, soit directement [...]
        data: Dict[str, Any] = {}
        if isinstance(raw.get("champs"), list):
            data["champs"] = raw["champs"]
        elif "name" in raw or (len(raw.keys()) == 1 and list(raw.values()) and isinstance(list(raw.values())[0], list)):
            # Force dans une enveloppe champs
            data["champs"] = [raw]
        else:
            # Si l'objet n'a pas de champs, tenter fallback DOM plus bas
            data["champs"] = []
        # Titre/description éventuels dans le JSON
        if isinstance(raw.get("title"), str):
            data["title"] = raw["title"].strip()
        if isinstance(raw.get("description"), str):
            data["description"] = raw["description"].strip()
        # Compléter avec HTML si manquant
        if "title" not in data and title_from_html:
            data["title"] = title_from_html
        if "description" not in data and desc_from_html:
            data["description"] = desc_from_html
        if data.get("champs"):
            return data

    # 2) Fallback DOM: tenter de reconstruire depuis la structure HTML rendue
    try:
        champs_map: Dict[str, List[str]] = {}
        # a) Récupérer les conteneurs de champs et préparer un mapping ancien_nom -> nouveau_titre (H3)
        drop_containers = []
        for champ_div in soup.select('.champ-cible'):
            try:
                h3 = champ_div.find('h3')
                title_text = h3.get_text(strip=True) if h3 else None
            except Exception:
                title_text = None
            drop = champ_div.find(class_='drop-area')
            if not drop:
                continue
            old_key = (drop.get('data-field-name') or '').strip()
            new_key = (title_text or old_key).strip()
            if new_key:
                champs_map.setdefault(new_key, [])
            drop_containers.append({'old': old_key, 'new': new_key})

        # Construire un dict de correspondance pour rediriger les anciens noms vers les nouveaux titres
        rename_map: Dict[str, str] = {}
        for item in drop_containers:
            if item['old'] and item['new']:
                rename_map[item['old']] = item['new']

        # b) Récupérer tous les mots et déterminer leur champ cible
        for mot in soup.select('.mot-draggable'):
            word = (mot.get_text() or '').strip()
            # Priorité: si le mot est déjà déposé dans une drop-area, on prend le champ réel
            parent_drop = mot.find_parent(class_='drop-area')
            field = None
            if parent_drop and parent_drop.has_attr('data-field-name'):
                field = (parent_drop.get('data-field-name') or '').strip()
            if not field:
                field = (mot.get('data-correct-field') or '').strip()
            if not field or not word:
                continue
            # Appliquer un éventuel renommage
            mapped = rename_map.get(field, field)
            champs_map.setdefault(mapped, []).append(word)

        # c) Si aucun champ détecté via .champ-cible, inférer depuis les mots (anciens noms)
        if not champs_map:
            inferred: Dict[str, List[str]] = {}
            for mot in soup.select('.mot-draggable'):
                word = (mot.get_text() or '').strip()
                field = (mot.get('data-correct-field') or '').strip()
                if word and field:
                    inferred.setdefault(field, []).append(word)
            champs_map = inferred
        # d) Normaliser en liste triée
        champs_list: List[Dict[str, Any]] = []
        for field_name in sorted(champs_map.keys()):
            words = champs_map[field_name]
            # dédupliquer en conservant l'ordre d'apparition
            seen = set()
            uniq_words = []
            for w in words:
                if w not in seen:
                    uniq_words.append(w)
                    seen.add(w)
            champs_list.append({"name": field_name, "words": uniq_words})
        result: Dict[str, Any] = {"champs": champs_list}
        if title_from_html:
            result["title"] = title_from_html
        if desc_from_html:
            result["description"] = desc_from_html
        return result
    except Exception:
        pass

    # 3) Dernier recours: retourner un squelette vide
    result: Dict[str, Any] = {"champs": []}
    if title_from_html:
        result["title"] = title_from_html
    if desc_from_html:
        result["description"] = desc_from_html
    return result
