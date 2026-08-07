from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models.faq import FAQ
from app.schemas.faq import FAQCreate, FAQUpdate, FAQResponse
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[FAQResponse])
def read_faqs(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    all_faqs: bool = False
) -> Any:
    """
    Retrieve FAQs. Public endpoint for active FAQs.
    """
    if all_faqs:
        faqs = db.query(FAQ).offset(skip).limit(limit).all()
    else:
        faqs = db.query(FAQ).filter(FAQ.is_active == True).offset(skip).limit(limit).all()
    return faqs

@router.post("/", response_model=FAQResponse, status_code=status.HTTP_201_CREATED)
def create_faq(
    *,
    db: Session = Depends(deps.get_db),
    faq_in: FAQCreate,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new FAQ. (Admin only)
    """
    faq = FAQ(
        category=faq_in.category,
        question=faq_in.question,
        answer=faq_in.answer,
        is_active=faq_in.is_active
    )
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq

@router.put("/{faq_id}", response_model=FAQResponse)
def update_faq(
    *,
    db: Session = Depends(deps.get_db),
    faq_id: int,
    faq_in: FAQUpdate,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Update an FAQ. (Admin only)
    """
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    update_data = faq_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(faq, field, value)
        
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq

@router.delete("/{faq_id}", response_model=FAQResponse)
def delete_faq(
    *,
    db: Session = Depends(deps.get_db),
    faq_id: int,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Delete an FAQ. (Admin only)
    """
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    db.delete(faq)
    db.commit()
    return faq
