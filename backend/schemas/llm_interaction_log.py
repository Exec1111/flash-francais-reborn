from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class LLMInteractionLogOut(BaseModel):
    id: int
    timestamp: datetime
    api_provider: str
    model_name: Optional[str]
    prompt_type: Optional[str]
    input_prompt: Optional[str]
    input_variables: Optional[Any]
    generation_config: Optional[Any]
    output_content: Optional[str]
    parsed_output: Optional[Any]
    error_message: Optional[str]
    request_token_count: Optional[int]
    response_token_count: Optional[int]
    duration_ms: Optional[int]
    user_id: Optional[int]

    class Config:
        orm_mode = True
