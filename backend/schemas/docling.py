from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class DoclingTable(BaseModel):
    index: int = Field(..., ge=0)
    html: str = Field("")


class DoclingExtractResponse(BaseModel):
    document_markdown: str = Field("")
    tables: List[DoclingTable] = Field(default_factory=list)


class DoclingStatusResponse(BaseModel):
    status: str = Field(..., description="pending|processing|ready|error")
    ocr_used: Optional[bool] = None
    docling_version: Optional[str] = None
    extracted_at: Optional[datetime] = None
    docling_error: Optional[str] = None
    docling_chars: Optional[int] = None
    document_markdown: Optional[str] = None
    tables: Optional[List[DoclingTable]] = None
