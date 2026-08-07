from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FAQBase(BaseModel):
    category: str
    question: str
    answer: str
    is_active: Optional[bool] = True

class FAQCreate(FAQBase):
    pass

class FAQUpdate(BaseModel):
    category: Optional[str] = None
    question: Optional[str] = None
    answer: Optional[str] = None
    is_active: Optional[bool] = None

class FAQResponse(FAQBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
