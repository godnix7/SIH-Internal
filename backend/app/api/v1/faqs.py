from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.core.middleware import get_current_user
from app.models.faq import FAQ
from app.schemas.faq import FAQCreate, FAQUpdate, FAQResponse
from app.models.auth import User

router = APIRouter()

@router.get("/", response_model=List[FAQResponse])
async def read_faqs(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    all_faqs: bool = False
) -> Any:
    """
    Retrieve FAQs. Public endpoint for active FAQs.
    """
    if all_faqs:
        stmt = select(FAQ).offset(skip).limit(limit)
    else:
        stmt = select(FAQ).where(FAQ.is_active == True).offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=FAQResponse, status_code=status.HTTP_201_CREATED)
async def create_faq(
    *,
    db: AsyncSession = Depends(get_db),
    faq_in: FAQCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create new FAQ. (Admin only)
    """
    if current_user.role != 'sys_admin':
        raise HTTPException(status_code=403, detail="Not enough permissions")

    faq = FAQ(
        category=faq_in.category,
        question=faq_in.question,
        answer=faq_in.answer,
        is_active=faq_in.is_active
    )
    db.add(faq)
    await db.commit()
    await db.refresh(faq)
    return faq

@router.put("/{faq_id}", response_model=FAQResponse)
async def update_faq(
    *,
    db: AsyncSession = Depends(get_db),
    faq_id: int,
    faq_in: FAQUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update an FAQ. (Admin only)
    """
    if current_user.role != 'sys_admin':
        raise HTTPException(status_code=403, detail="Not enough permissions")

    stmt = select(FAQ).where(FAQ.id == faq_id)
    result = await db.execute(stmt)
    faq = result.scalars().first()
    
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    update_data = faq_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(faq, field, value)
        
    db.add(faq)
    await db.commit()
    await db.refresh(faq)
    return faq

@router.delete("/{faq_id}", response_model=FAQResponse)
async def delete_faq(
    *,
    db: AsyncSession = Depends(get_db),
    faq_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Delete an FAQ. (Admin only)
    """
    if current_user.role != 'sys_admin':
        raise HTTPException(status_code=403, detail="Not enough permissions")

    stmt = select(FAQ).where(FAQ.id == faq_id)
    result = await db.execute(stmt)
    faq = result.scalars().first()
    
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    await db.delete(faq)
    await db.commit()
    return faq
