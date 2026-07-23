import hashlib
import json
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.blockchain import EventChain, MerkleAnchor
from app.models.incident import Incident, IncidentEvent

class BlockchainService:
    @staticmethod
    async def append_event(db: AsyncSession, incident_id: str, event_id: str, event_type: str, details: dict):
        """
        Creates a cryptographic hash for a new incident event and links it to the chain.
        Hash_N = SHA-256( Hash_N-1 || event_type || event_data || timestamp )
        """
        # 1. Fetch the incident to get the current chain_head (Hash_N-1)
        incident_result = await db.execute(select(Incident).where(Incident.id == incident_id))
        incident = incident_result.scalars().first()
        
        if not incident:
            raise ValueError(f"Incident {incident_id} not found")
            
        previous_hash = incident.chain_head
        
        # 2. Serialize current event data deterministically
        data_string = json.dumps(details, sort_keys=True) if details else ""
        timestamp_str = datetime.now().isoformat()
        
        # 3. Compute Hash_N
        hash_input = f"{previous_hash or ''}|{event_type}|{data_string}|{timestamp_str}"
        current_hash = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()
        
        # 4. Store the hash in EventChain
        chain_link = EventChain(
            incident_id=incident_id,
            event_id=event_id,
            previous_hash=previous_hash,
            hash=current_hash
        )
        db.add(chain_link)
        
        # 5. Update the Incident's chain_head
        incident.chain_head = current_hash
        
        # Commit is handled by the caller
        return current_hash
        
    @staticmethod
    async def get_incident_chain(db: AsyncSession, incident_id: str):
        """
        Retrieves the full chronological chain of hashes for an incident for legal verification.
        """
        result = await db.execute(
            select(EventChain).where(EventChain.incident_id == incident_id).order_by(EventChain.created_at)
        )
        return result.scalars().all()
