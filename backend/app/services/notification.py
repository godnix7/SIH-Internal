import uuid
import logging
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.identity import EmergencyContact
from app.models.auth import Device, User
from app.core.security import decrypt_pii

logger = logging.getLogger(__name__)

async def send_push_notification(db: AsyncSession, user_id: uuid.UUID, title: str, body: str, data: Optional[Dict[str, Any]] = None, priority: str = "high"):
    """
    Mock pushing an FCM/APNs notification to all user devices.
    """
    result = await db.execute(select(Device).where(Device.user_id == user_id))
    devices = result.scalars().all()
    
    if not devices:
        logger.warning(f"No devices found for user {user_id} to send push notification.")
        return
        
    for device in devices:
        if device.push_token:
            # Mocking network call to FCM/APNs
            logger.info(f"[MOCK PUSH] -> {device.push_token} (Priority: {priority}) | {title}: {body} | Data: {data}")
        else:
            logger.info(f"[MOCK PUSH] -> Skipped device {device.id} (No push token)")


async def send_sms(phone_hash: str, phone_plaintext: str, template_id: str, variables: Dict[str, str]):
    """
    Mock sending an SMS via DLT compliant gateway.
    """
    # In reality, templates are fetched from DLT registry.
    mock_templates = {
        "SOS_EMERGENCY": "EMERGENCY: {name} has triggered an SOS alert via Yatri Shield. View live tracking and incident status here: {link}"
    }
    
    template = mock_templates.get(template_id, "Notification: {name}")
    message = template.format(**variables)
    
    logger.info(f"[MOCK SMS] -> {phone_plaintext} | {message}")


async def notify_emergency_contacts(user_id: uuid.UUID, incident_id: uuid.UUID):
    """
    Looks up emergency contacts for the user and sends them an SOS SMS.
    """
    from app.database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        # 1. Fetch user to get their name
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if not user:
            return
            
        # We could fetch their actual name from Identity if they have one, 
        # but for simplicity/safety, we might use their phone number or "Your contact"
        # To keep it robust without extra joins, we'll just say "Your contact".
        # In a real impl, we'd fetch identity.identities.name_enc and decrypt it.
        
        # 2. Fetch emergency contacts
        contacts_result = await db.execute(
            select(EmergencyContact)
            .where(EmergencyContact.user_id == user_id, EmergencyContact.notify_sos == True)
        )
        contacts = contacts_result.scalars().all()
        

        # 3. Dispatch SMS
        incident_link = f"https://yatrishield.gov.in/incident/{incident_id}"
        
        for contact in contacts:
            contact_phone = decrypt_pii(contact.phone_enc)
            await send_sms(
                phone_hash="hash_not_needed_for_mock",
                phone_plaintext=contact_phone,
                template_id="SOS_EMERGENCY",
                variables={
                    "name": "Your contact",
                    "link": incident_link
                }
            )
