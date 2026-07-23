import asyncio
import hashlib
from datetime import datetime
import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from app.database import engine
from app.models.incident import Incident
from app.models.blockchain import MerkleAnchor

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False
)

def compute_merkle_root(hashes: list) -> str:
    """
    Computes a simple Merkle Root from a list of hashes.
    """
    if not hashes:
        return ""
        
    # Ensure even number of leaves
    current_level = hashes[:]
    if len(current_level) % 2 != 0:
        current_level.append(current_level[-1])
        
    while len(current_level) > 1:
        next_level = []
        for i in range(0, len(current_level), 2):
            left = current_level[i]
            right = current_level[i+1]
            combined = f"{left}{right}"
            next_hash = hashlib.sha256(combined.encode('utf-8')).hexdigest()
            next_level.append(next_hash)
        current_level = next_level
        
    return current_level[0]

async def anchor_batcher_task():
    """
    Periodically collects terminal chain_heads of active incidents,
    constructs a Merkle Tree, and anchors it.
    """
    while True:
        try:
            await asyncio.sleep(300) # Run every 5 minutes (for demo we might want it faster, but 300 is realistic)
            
            async with AsyncSessionLocal() as session:
                # 1. Fetch active incidents that have a chain_head
                # In production we would track which chain_heads haven't been anchored yet
                result = await session.execute(
                    select(Incident).where(
                        Incident.status.notin_(['closed']), 
                        Incident.chain_head.isnot(None)
                    )
                )
                incidents = result.scalars().all()
                
                if not incidents:
                    continue
                    
                chain_heads = [inc.chain_head for inc in incidents]
                
                # 2. Compute Merkle Root
                merkle_root = compute_merkle_root(chain_heads)
                
                if not merkle_root:
                    continue
                    
                # 3. Submit to "Blockchain" (Mock Ledger)
                # In Phase 5 MVP we simply store it in PostgreSQL simulating a Transparency Log
                anchor = MerkleAnchor(
                    merkle_root=merkle_root,
                    included_hashes=chain_heads,
                    transaction_id=f"tx_mock_{int(datetime.now().timestamp())}"
                )
                session.add(anchor)
                await session.commit()
                
                print(f"[BLOCKCHAIN ANCHOR] Successfully batched {len(chain_heads)} incidents. Merkle Root: {merkle_root}")
                
        except Exception as e:
            print(f"[BLOCKCHAIN ANCHOR] Error during batching: {e}")

def start_anchor_batcher():
    loop = asyncio.get_event_loop()
    loop.create_task(anchor_batcher_task())
