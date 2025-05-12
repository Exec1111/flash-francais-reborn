from pydantic import BaseModel, Field

class LLMInteractionLogCreate(BaseModel):
    input_prompt: str = Field(..., description="Prompt envoyé au modèle IA.")
    model_response: str = Field(..., description="Réponse générée par le modèle IA.")

class LLMInteractionLogRead(BaseModel):
    id: int
    input_prompt: str
    model_response: str

    class Config:
        orm_mode = True
