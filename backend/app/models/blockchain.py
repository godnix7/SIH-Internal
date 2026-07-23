import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class EventChain(Base):
    """
    Stores the cryptographic hash chain for incident events.
    Formula: SHA-256( previous_hash || event_type || event_data || timestamp )
    """
    __tablename__ = "event_chain"
    __table_args__ = {"schema": "blockchain"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey('incident.incidents.id'), nullable=False, index=True)
    event_id = Column(UUID(as_uuid=True), ForeignKey('incident.incident_events.id'), nullable=False, unique=True)
    
    previous_hash = Column(String, nullable=True) # Null for the very first event
    hash = Column(String, nullable=False, unique=True)
    
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)


class MerkleAnchor(Base):
    """
    Stores the batch Merkle Root of multiple active incidents.
    In production, this root is submitted to a Hyperledger Besu consortium network.
    """
    __tablename__ = "merkle_anchors"
    __table_args__ = {"schema": "blockchain"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    merkle_root = Column(String, nullable=False, unique=True)
    
    # Stores a list of event_chain hashes that were included in this batch
    included_hashes = Column(JSON, nullable=False) 
    
    transaction_id = Column(String, nullable=True) # Transaction ID on the public/permissioned ledger
    anchored_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
