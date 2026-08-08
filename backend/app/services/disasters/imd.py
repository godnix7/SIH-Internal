from typing import List
from app.services.disasters.base import DisasterSourceAdapter, DisasterEvent
from app.services.disasters.ndma import AccessRequiredError

class IMDAdapter(DisasterSourceAdapter):
    @property
    def source_name(self) -> str:
        return "IMD"

    async def fetch_events(self) -> List[DisasterEvent]:
        # IMD official CAP feeds are not currently verified as publicly open without credentials/scraping.
        raise AccessRequiredError("NOT IMPLEMENTED / ACCESS REQUIRED")
