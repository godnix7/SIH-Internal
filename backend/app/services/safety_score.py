"""
Safety Score Computation Engine

Computes a 0-100 safety score for a geographic zone based on:
- Crime incident count (30% weight)
- Severity distribution (25% weight)
- Recency factor (20% weight)
- Incident density per km² (15% weight)
- Resolution rate (10% weight)
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional


SEVERITY_WEIGHTS = {
    'critical': 10,
    'high': 7,
    'medium': 4,
    'low': 2,
    'info': 1,
}


def compute_safety_score(
    crime_data: Optional[List[Dict[str, Any]]] = None,
    area_sq_km: float = 1.0,
) -> int:
    """
    Compute a 0-100 safety score for a zone.
    100 = perfectly safe, 0 = extremely dangerous.
    """
    if not crime_data or len(crime_data) == 0:
        return 100

    now = datetime.utcnow()
    total = len(crime_data)

    # 1. Crime count factor (30% weight): more crimes = lower score
    # Scale: 0 incidents=100, 5=75, 10=50, 20=25, 30+=0
    count_score = max(0, 100 - (total * 3.33))

    # 2. Severity distribution (25% weight)
    severity_total = 0
    max_possible_severity = total * 10  # max if all critical
    for crime in crime_data:
        sev = (crime.get('severity') or 'medium').lower()
        severity_total += SEVERITY_WEIGHTS.get(sev, 4)
    if max_possible_severity > 0:
        severity_ratio = severity_total / max_possible_severity
    else:
        severity_ratio = 0
    severity_score = max(0, 100 - (severity_ratio * 100))

    # 3. Recency factor (20% weight): recent incidents weigh more
    recent_count = 0
    for crime in crime_data:
        date_str = crime.get('date') or crime.get('reported_at')
        if date_str:
            try:
                crime_date = datetime.fromisoformat(str(date_str).replace('Z', '+00:00').replace('+00:00', ''))
                if (now - crime_date) < timedelta(days=30):
                    recent_count += 1
            except (ValueError, TypeError):
                pass
    recent_ratio = recent_count / max(total, 1)
    recency_score = max(0, 100 - (recent_ratio * 100))

    # 4. Incident density per km² (15% weight)
    density = total / max(area_sq_km, 0.01)
    # Scale: 0/km²=100, 5/km²=75, 10/km²=50, 20/km²=0
    density_score = max(0, 100 - (density * 5))

    # 5. Resolution rate (10% weight)
    resolved = sum(1 for c in crime_data if (c.get('status') or '').lower() in ('resolved', 'closed', 'arrested'))
    resolution_rate = resolved / max(total, 1)
    resolution_score = resolution_rate * 100  # Higher resolution = better

    # Weighted combination
    final = (
        count_score * 0.30 +
        severity_score * 0.25 +
        recency_score * 0.20 +
        density_score * 0.15 +
        resolution_score * 0.10
    )

    return max(0, min(100, int(round(final))))


def get_score_label(score: int) -> str:
    """Return a human-readable label for a safety score."""
    if score >= 76:
        return "Safe"
    elif score >= 51:
        return "Moderate"
    elif score >= 26:
        return "Caution"
    else:
        return "Danger"


def get_score_color(score: int) -> str:
    """Return hex color for a safety score."""
    if score >= 76:
        return "#16a34a"  # green
    elif score >= 51:
        return "#eab308"  # yellow
    elif score >= 26:
        return "#f97316"  # orange
    else:
        return "#dc2626"  # red
