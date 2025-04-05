from pydantic import BaseModel

class ProgressionBase(BaseModel):
    title: str
    description: str | None = None

class ProgressionCreate(ProgressionBase):
    pass

class ProgressionUpdate(ProgressionBase):
    pass

class ProgressionRead(ProgressionBase):
    id: int

    class Config:
        from_attributes = True
