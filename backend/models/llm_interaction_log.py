from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from database import Base

class LLMInteractionLog(Base):
    __tablename__ = "llm_interaction_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    api_provider = Column(String(50), nullable=False, index=True)
    model_name = Column(String(100), nullable=True)
    prompt_type = Column(String(100), nullable=True, index=True) # e.g., 'generate_resource', 'merge_content'
    input_prompt = Column(Text, nullable=True)
    input_variables = Column(JSON, nullable=True)
    generation_config = Column(JSON, nullable=True)
    output_content = Column(Text, nullable=True)
    parsed_output = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    request_token_count = Column(Integer, nullable=True)
    response_token_count = Column(Integer, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)

    user = relationship("User")

    def __repr__(self):
        return f"<LLMInteractionLog(id={self.id}, timestamp={self.timestamp}, provider={self.api_provider})>"
