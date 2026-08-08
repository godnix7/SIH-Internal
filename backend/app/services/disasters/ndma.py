from typing import List
from app.services.disasters.base import DisasterSourceAdapter, DisasterEvent

class AccessRequiredError(Exception):
    pass

class NDMAAdapter(DisasterSourceAdapter):
    @property
    def source_name(self) -> str:
        return "NDMA"

    async def fetch_events(self) -> List[DisasterEvent]:
        # NDMA SACHET CAP feeds are not currently verified as publicly open without credentials/scraping.
        raise AccessRequiredError("NOT IMPLEMENTED / ACCESS REQUIRED")
