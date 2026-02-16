"""
Disasters API Route with MOSDAC Integration
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
import logging

logger = logging.getLogger(__name__)

disasters_router = APIRouter(prefix="/api", tags=["Disasters"])

# Historical disaster data baseline
HISTORICAL_DISASTERS = [
    {
        "id": "cyclone_amphan_2020",
        "type": "cyclone",
        "title": "Cyclone Amphan (2020)",
        "date": "2020-05-20",
        "location": "Odisha Coast",
        "severity": "extreme",
        "status": "past",
        "casualties": 26,
        "affected_population": 11000000,
        "damage": "$13.2 billion",
        "description": "Extremely severe cyclonic storm affecting Eastern India",
        "source": "Historical Record",
    },
    {
        "id": "flood_kerala_2023",
        "type": "flood",
        "title": "Kerala Floods 2023",
        "date": "2023-07-15",
        "location": "Kerala",
        "severity": "high",
        "status": "past",
        "casualties": 45,
        "affected_population": 1200000,
        "damage": "$2.8 billion",
        "description": "Severe flooding in Kerala due to heavy monsoon rains",
        "source": "Historical Record",
    },
    {
        "id": "earthquake_manipur_2023",
        "type": "earthquake",
        "title": "Manipur Earthquake 2023",
        "date": "2023-04-14",
        "location": "Kolkata",
        "severity": "severe",
        "status": "past",
        "casualties": 127,
        "affected_population": 500000,
        "damage": "$3.2 billion",
        "description": "Magnitude 6.4 earthquake causing widespread damage",
        "source": "Historical Record",
    },
    {
        "id": "cyclone_biparjoy_2023",
        "type": "cyclone",
        "title": "Cyclone Biparjoy (2023)",
        "date": "2023-06-15",
        "location": "Gujarat",
        "severity": "high",
        "status": "past",
        "casualties": 2,
        "affected_population": 900000,
        "damage": "$1.5 billion",
        "description": "Very severe cyclonic storm affecting Gujarat coast",
        "source": "Historical Record",
    },
    {
        "id": "flood_mumbai_2024",
        "type": "flood",
        "title": "Mumbai Urban Flooding 2024",
        "date": "2024-07-08",
        "location": "Mumbai",
        "severity": "high",
        "status": "past",
        "casualties": 12,
        "affected_population": 3000000,
        "damage": "$800 million",
        "description": "Heavy monsoon rains causing severe urban flooding in Mumbai",
        "source": "Historical Record",
    },
    {
        "id": "heatwave_delhi_2024",
        "type": "heatwave",
        "title": "Delhi NCR Heatwave 2024",
        "date": "2024-05-25",
        "location": "Delhi",
        "severity": "extreme",
        "status": "past",
        "casualties": 98,
        "affected_population": 25000000,
        "damage": "$500 million",
        "description": "Extreme heatwave with temperatures exceeding 49°C",
        "source": "Historical Record",
    },
]


@disasters_router.get("/disasters")
async def get_disasters(
    disaster_type: Optional[str] = None,
    limit: int = Query(default=50, le=100),
):
    """Get disaster data with optional MOSDAC real-time satellite data."""
    try:
        disasters = list(HISTORICAL_DISASTERS)

        # Try to fetch real-time MOSDAC data
        try:
            from mosdac_service import get_mosdac_service
            from data_transformers import (
                transform_cyclone_data,
                transform_flood_data,
                merge_with_existing_disasters,
            )

            mosdac_service = get_mosdac_service()
            mosdac_disasters = []

            cyclone_entries = await mosdac_service.get_cyclone_data(days_back=14)
            mosdac_disasters.extend(transform_cyclone_data(cyclone_entries))

            flood_entries = await mosdac_service.get_flood_data(days_back=14)
            mosdac_disasters.extend(transform_flood_data(flood_entries))

            if mosdac_disasters:
                disasters = merge_with_existing_disasters(mosdac_disasters, disasters)
                logger.info(f"Merged {len(mosdac_disasters)} MOSDAC disasters")
        except Exception as e:
            logger.warning(f"MOSDAC unavailable: {e}, using historical data only")

        if disaster_type:
            disasters = [
                d for d in disasters if d.get("type", "").lower() == disaster_type.lower()
            ]

        disasters.sort(key=lambda x: x.get("date", ""), reverse=True)
        return {"disasters": disasters[:limit]}

    except Exception as e:
        logger.error(f"Error fetching disasters: {e}")
        raise HTTPException(status_code=500, detail="Unable to load disasters data")
