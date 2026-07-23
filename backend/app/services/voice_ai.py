import uuid
from typing import Dict, Any, Optional
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.incident import Incident
from app.models.auth import User

logger = logging.getLogger(__name__)

class EmergencyVoiceBot:
    def __init__(self):
        # In production, this would initialize OpenAI/Gemini clients.
        self.system_intro = (
            "Hello, I am the Yatri Shield AI operator. This is an automated emergency call. "
            "Your contact {user_name} has triggered an SOS alert. "
        )

    async def get_incident_context(self, db: AsyncSession, incident_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        result = await db.execute(select(Incident).where(Incident.id == incident_id))
        incident = result.scalars().first()
        if not incident:
            return None

        user_result = await db.execute(select(User).where(User.id == incident.user_id))
        user = user_result.scalars().first()
        
        # Format location (WKT to approx lat/lon string)
        loc_str = "an unknown location"
        if incident.location:
            try:
                # Format: SRID=4326;POINT(lon lat)
                coords = incident.location.split("(")[1].replace(")", "")
                lon, lat = coords.split(" ")
                loc_str = f"latitude {lat}, longitude {lon}"
            except Exception:
                pass

        return {
            "user_name": "Your contact" if not user else f"User {user.id}", # Placeholder for Identity Name
            "severity": incident.severity,
            "type": incident.type,
            "location": loc_str,
            "status": incident.status
        }

    async def generate_initial_greeting(self, db: AsyncSession, incident_id: uuid.UUID) -> str:
        """
        Generates the TwiML <Say> text for when the contact first picks up.
        """
        context = await self.get_incident_context(db, incident_id)
        if not context:
            return "Hello, I am the Yatri Shield AI operator. An unknown emergency has occurred."

        greeting = self.system_intro.format(user_name=context['user_name'])
        greeting += f"The system detected a {context['severity']} severity {context['type']} incident at {context['location']}. "
        greeting += "Please state your question about the incident, or say 'dispatch' to confirm emergency services."
        
        return greeting

    async def generate_response(self, user_speech: str, db: AsyncSession, incident_id: uuid.UUID) -> str:
        """
        Takes the transcribed speech from Twilio <Gather>, sends it to an LLM with the incident context, 
        and returns the AI's response text.
        """
        # 1. Fetch live context
        context = await self.get_incident_context(db, incident_id)
        
        # 2. In production, call LLM. Here we mock a basic conversational router.
        user_speech = user_speech.lower()
        
        if "where" in user_speech or "location" in user_speech:
            return f"The last known location is {context['location']}. Do you want me to text you the map link?"
            
        elif "what happened" in user_speech or "why" in user_speech:
            return f"The automated engine detected a {context['type']} anomaly with {context['severity']} severity. The exact cause is unverified, but sensors indicate high risk."
            
        elif "dispatch" in user_speech or "police" in user_speech or "ambulance" in user_speech:
            return "Understood. I am upgrading the ticket priority and confirming dispatch with local authorities. Thank you."
            
        else:
            return "I am an AI. I have limited context. The recorded severity is " + str(context['severity']) + ". Please check the app for live tracking."

voice_ai_engine = EmergencyVoiceBot()
