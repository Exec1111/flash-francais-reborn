"""
Module contenant la classe de prompt pour la génération de QCM.
"""
from typing import Dict, Any, List
import json
import logging
import re

from backend.ai.prompts.base import BasePrompt

logger = logging.getLogger(__name__)

class QCMPrompt(BasePrompt):
    """
    Classe pour générer des exercices de type QCM (Questionnaire à Choix Multiples).
    """
    
    def __init__(self):
        """
        Initialise le prompt pour la génération de QCM.
        """
        system_prompt = """
Tu es un expert en pédagogie du français langue étrangère (FLE).
Ta tâche est de créer un exercice de type QCM (Questionnaire à Choix Multiples) de haute qualité.
L'exercice doit être adapté au niveau de l'apprenant et porter sur le thème spécifié.
Chaque question doit avoir exactement 4 options, dont une seule est correcte.
Renvoie ta réponse au format JSON structuré comme spécifié dans les instructions.
"""

        user_prompt_template = """
Crée un QCM en français sur le thème: {theme}.
Niveau de l'apprenant: {niveau} (A1, A2, B1, B2, C1 ou C2 selon le CECR).
Objectif pédagogique: {objectif_pedagogique}.
Nombre de questions: {nombre_questions}.

Le QCM doit respecter les contraintes suivantes:
1. Les questions doivent être claires et adaptées au niveau {niveau}.
2. Chaque question doit avoir exactement 4 options (A, B, C, D).
3. Une seule option doit être correcte.
4. Les distracteurs (options incorrectes) doivent être plausibles.
5. Les questions doivent couvrir différents aspects du thème.

Retourne un objet JSON avec la structure suivante:
{{
  "titre": "Titre du QCM",
  "description": "Brève description de l'exercice",
  "niveau": "{niveau}",
  "theme": "{theme}",
  "questions": [
    {{
      "id": 1,
      "texte": "Texte de la question",
      "options": [
        {{ "id": "A", "texte": "Option A" }},
        {{ "id": "B", "texte": "Option B" }},
        {{ "id": "C", "texte": "Option C" }},
        {{ "id": "D", "texte": "Option D" }}
      ],
      "reponse_correcte": "ID de l'option correcte (A, B, C ou D)",
      "explication": "Explication de la réponse correcte"
    }}
  ]
}}

Assure-toi que le JSON soit bien formé et valide.
"""
        
        super().__init__(system_prompt, user_prompt_template)
    
    @classmethod
    def get_variables_model(cls):
        """
        Renvoie le modèle Pydantic pour les variables QCM.
        
        Returns:
            Type[BaseModel]: La classe QCMVariables
        """
        from ai.schemas import QCMVariables
        return QCMVariables
        
    def parse_response(self, response: str) -> Dict[str, Any]:
        """
        Parse la réponse du LLM en structure de données utilisable.
        
        Cette méthode extrait et valide le JSON de la réponse du LLM.
        
        Args:
            response: Réponse brute du LLM
            
        Returns:
            Données structurées du QCM
            
        Raises:
            ValueError: Si la réponse ne contient pas de JSON valide ou si la structure est incorrecte
        """
        try:
            # Extraire le JSON si entouré par des délimiteurs de code
            json_match = re.search(r'```json\n([\s\S]*?)\n```|```([\s\S]*?)```|\{[\s\S]*\}', response)
            if json_match:
                json_str = json_match.group(1) or json_match.group(2) or json_match.group(0)
            else:
                json_str = response
            
            # Nettoyer et parser le JSON
            data = json.loads(json_str)
            
            # Valider la structure minimale attendue
            self._validate_qcm_structure(data)
            
            return data
            
        except json.JSONDecodeError as e:
            logger.error(f"Impossible de parser la réponse JSON: {e}")
            raise ValueError(f"La réponse du LLM n'est pas un JSON valide: {e}")
    
    def _validate_qcm_structure(self, data: Dict[str, Any]) -> None:
        """
        Valide la structure du QCM généré.
        
        Args:
            data: Données du QCM à valider
            
        Raises:
            ValueError: Si la structure ne respecte pas les contraintes attendues
        """
        # Vérifier les champs obligatoires
        required_fields = ["titre", "description", "niveau", "theme", "questions"]
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Champ obligatoire manquant dans la réponse: {field}")
        
        # Vérifier que questions est une liste non vide
        if not isinstance(data["questions"], list) or len(data["questions"]) == 0:
            raise ValueError("Le QCM doit contenir au moins une question")
        
        # Vérifier chaque question
        for i, question in enumerate(data["questions"]):
            # Vérifier les champs obligatoires de la question
            q_required_fields = ["id", "texte", "options", "reponse_correcte"]
            for field in q_required_fields:
                if field not in question:
                    raise ValueError(f"Champ obligatoire manquant dans la question {i+1}: {field}")
            
            # Vérifier que options est une liste de 4 éléments
            if not isinstance(question["options"], list) or len(question["options"]) != 4:
                raise ValueError(f"La question {i+1} doit avoir exactement 4 options")
            
            # Vérifier que chaque option a un id et un texte
            for j, option in enumerate(question["options"]):
                if "id" not in option or "texte" not in option:
                    raise ValueError(f"Option {j+1} de la question {i+1} doit avoir un id et un texte")
            
            # Vérifier que la réponse correcte correspond à l'id d'une des options
            option_ids = [opt["id"] for opt in question["options"]]
            if question["reponse_correcte"] not in option_ids:
                raise ValueError(f"La réponse correcte de la question {i+1} doit correspondre à l'id d'une des options")
