# backend/schemas/ai_suggestion.py
from pydantic import BaseModel, Field
from typing import List, Dict, Any

class AISuggestionItem(BaseModel):
    type_key: str = Field(..., description="La clé du type d'exercice suggéré.")
    subtype_key: str = Field(..., description="La clé du sous-type d'exercice suggéré.")
    justification: str = Field(..., description="Brève explication de la pertinence de cette suggestion.")
    parameters: List[Dict[str, Any]] = Field(..., description="Liste des paramètres pour configurer l'exercice suggéré, avec leurs valeurs potentielles.")

class AISuggestionResponse(BaseModel):
    suggestions: List[AISuggestionItem] = Field(..., description="Liste des types d'exercices suggérés.", min_length=0)
