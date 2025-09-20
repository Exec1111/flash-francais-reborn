from bs4 import BeautifulSoup
from typing import Dict, Any, List


def html_to_qcm_json(html: str) -> Dict[str, Any]:
    """
    Transforme un HTML statique d'édition (version TinyMCE) en JSON canonique QCM.

    Attentes HTML minimales:
    - <h1> titre </h1>
    - <div class="description"> ... </div> (optionnel)
    - Pour chaque question:
      <div class="question" data-id="..." data-correct="...">
         <div class="question-title"> ... </div>
         <ul class="options">
            <li data-option-id="...">
               <label><input type="radio" name="q{ID}" value="{OPTION_ID}"> Texte option</label>
            </li>
         </ul>
         <div class="explication">Texte</div>
      </div>
    """
    soup = BeautifulSoup(html or "", "html.parser")
    title_el = soup.find("h1")
    description_el = soup.find(class_="description")

    questions_json: List[Dict[str, Any]] = []
    for q_div in soup.select("div.question"):
        q_id = (q_div.get("data-id") or "").strip()
        correct = (q_div.get("data-correct") or "").strip()
        q_title_el = q_div.find(class_="question-title")
        q_text = (q_title_el.get_text(strip=True) if q_title_el else "").strip()

        options_json: List[Dict[str, Any]] = []
        for li in q_div.select("ul.options > li"):
            opt_id = (li.get("data-option-id") or "").strip()
            # Chercher le texte visible (hors input)
            label = li.find("label")
            opt_text = ""
            if label:
                # Retirer l'input et récupérer le texte
                input_el = label.find("input")
                if input_el:
                    input_el.extract()
                opt_text = label.get_text(strip=True)
            else:
                # Fallback: texte direct du li
                opt_text = li.get_text(strip=True)
            options_json.append({"id": opt_id, "texte": opt_text})

        exp_el = q_div.find(class_="explication")
        exp_text = (exp_el.get_text(strip=True) if exp_el else "").strip()

        questions_json.append({
            "id": q_id,
            "texte": q_text,
            "options": options_json,
            "reponse_correcte": correct,
            "explication": exp_text,
        })

    result = {
        "titre": (title_el.get_text(strip=True) if title_el else "").strip(),
        "description": (description_el.get_text(strip=True) if description_el else "").strip() or None,
        "questions": questions_json,
    }
    return result
