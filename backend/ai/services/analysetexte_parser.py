from bs4 import BeautifulSoup
from typing import Dict, Any, List


def html_to_analysetexte_json(html: str) -> Dict[str, Any]:
    """
    Transforme un HTML statique d'édition (version TinyMCE) en JSON canonique pour l'analyse de texte.

    Attentes HTML minimales:
    - <h1 id="analysis-title"> titre </h1>
    - Pour chaque section:
      <section class="analysis-section" id="section-{id}">
         <h3>{titre section}</h3>
         <div class="qa-container">
            <div class="qa-pair">
               <div class="question">Question</div>
               <div class="answer">Réponse</div>
            </div>
         </div>
      </section>
    """
    soup = BeautifulSoup(html or "", "html.parser")
    
    # Récupérer le titre principal
    title_el = soup.find("h1", id="analysis-title")
    if not title_el:
        title_el = soup.find("h1")
    
    sections_json: List[Dict[str, Any]] = []
    
    # Parcourir les sections d'analyse (section-1 à section-6)
    for i in range(1, 7):
        section_el = soup.find("section", id=f"section-{i}")
        if not section_el:
            continue
            
        # Récupérer le titre de la section depuis le h3
        section_title_el = section_el.find("h3")
        section_title = ""
        if section_title_el:
            section_title = section_title_el.get_text(strip=True)
            # Nettoyer le titre (enlever les emojis et numéros)
            if ". " in section_title:
                section_title = section_title.split(". ", 1)[1] if len(section_title.split(". ", 1)) > 1 else section_title
        
        # Récupérer les paires question/réponse
        qa_pairs_json: List[Dict[str, Any]] = []
        qa_container = section_el.find(class_="qa-container")
        
        if qa_container:
            for qa_pair in qa_container.find_all(class_="qa-pair"):
                question_el = qa_pair.find(class_="question")
                answer_el = qa_pair.find(class_="answer")
                
                question_text = question_el.get_text(strip=True) if question_el else ""
                answer_text = ""
                
                if answer_el:
                    # Préserver les sauts de ligne dans la réponse
                    answer_text = answer_el.get_text(separator="\n", strip=True)
                
                if question_text:  # Ne pas ajouter si pas de question
                    qa_pairs_json.append({
                        "question": question_text,
                        "answer": answer_text
                    })
        
        # Ajouter la section même si elle n'a pas de Q/R (pour préserver la structure)
        sections_json.append({
            "id": i,
            "title": section_title,
            "qa_pairs": qa_pairs_json
        })
    
    result = {
        "analysisTitle": (title_el.get_text(strip=True) if title_el else "").strip() or "Fiche d'Analyse de Texte",
        "sections": sections_json
    }
    
    return result
