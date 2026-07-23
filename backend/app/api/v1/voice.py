import uuid
from fastapi import APIRouter, Depends, Request, Response, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import logging

from app.database import get_db
from app.services.voice_ai import voice_ai_engine

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/outbound/{incident_id}")
async def outbound_call_webhook(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook called by Twilio when the Emergency Contact picks up the phone.
    Returns TwiML instructing Twilio to read the greeting and gather speech.
    """
    greeting = await voice_ai_engine.generate_initial_greeting(db, incident_id)
    
    # Construct TwiML XML
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Gather input="speech" action="/api/v1/voice/respond/{incident_id}" timeout="5" speechTimeout="auto">
            <Say voice="Polly.Joanna-Neural">{greeting}</Say>
        </Gather>
        <Say voice="Polly.Joanna-Neural">I did not hear a response. Hanging up. Please check your SMS for the live tracking link.</Say>
    </Response>
    """
    return Response(content=twiml, media_type="text/xml")


@router.post("/respond/{incident_id}")
async def respond_call_webhook(
    incident_id: uuid.UUID,
    SpeechResult: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook called by Twilio after capturing the user's speech.
    Sends speech to the LLM (VoiceBot), generates response, and asks for more input.
    """
    logger.info(f"[VOICE AI] User speech detected: {SpeechResult}")
    
    ai_response = await voice_ai_engine.generate_response(SpeechResult, db, incident_id)
    
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Gather input="speech" action="/api/v1/voice/respond/{incident_id}" timeout="5" speechTimeout="auto">
            <Say voice="Polly.Joanna-Neural">{ai_response}</Say>
        </Gather>
        <Say voice="Polly.Joanna-Neural">Goodbye.</Say>
    </Response>
    """
    return Response(content=twiml, media_type="text/xml")
