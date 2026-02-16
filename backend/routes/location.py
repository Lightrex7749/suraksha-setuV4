"""
Location API Routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger(__name__)

location_router = APIRouter(prefix="/api/location", tags=["Location"])


class LocationUpdate(BaseModel):
    lat: float
    lon: float
    city: Optional[str] = None
    state: Optional[str] = None


class PincodeRequest(BaseModel):
    pincode: str


@location_router.get("/current")
async def get_current_location():
    """Get location based on IP geolocation (fallback)."""
    # Default to Delhi for local dev
    return {
        "lat": 28.6139,
        "lon": 77.209,
        "city": "New Delhi",
        "state": "Delhi",
        "country": "India",
        "display_name": "New Delhi, Delhi, India",
    }


@location_router.post("/update")
async def update_location(data: LocationUpdate):
    """Update user's location."""
    return {
        "success": True,
        "location": {
            "lat": data.lat,
            "lon": data.lon,
            "city": data.city or "Unknown",
            "state": data.state or "Unknown",
        },
    }


@location_router.post("/validate-pincode")
async def validate_pincode(data: PincodeRequest):
    """Validate an Indian PIN code and return location."""
    pincode = data.pincode.strip()
    if not pincode.isdigit() or len(pincode) != 6:
        raise HTTPException(status_code=400, detail="Invalid PIN code format")

    # State mapping by first 2 digits
    state_map = {
        "11": ("Delhi", 28.6139, 77.2090),
        "12": ("Haryana", 29.0588, 76.0856),
        "13": ("Punjab", 31.1471, 75.3412),
        "14": ("Chandigarh", 30.7333, 76.7794),
        "20": ("Uttar Pradesh", 26.8467, 80.9462),
        "21": ("Uttar Pradesh", 26.8467, 80.9462),
        "30": ("Rajasthan", 27.0238, 74.2179),
        "40": ("Maharashtra", 19.7515, 75.7139),
        "50": ("Telangana", 18.1124, 79.0193),
        "56": ("Karnataka", 15.3173, 75.7139),
        "60": ("Tamil Nadu", 11.1271, 78.6569),
        "67": ("Kerala", 10.8505, 76.2711),
        "70": ("West Bengal", 22.9868, 87.855),
        "78": ("Assam", 26.2006, 92.9376),
    }

    prefix = pincode[:2]
    if prefix in state_map:
        state, lat, lon = state_map[prefix]
        return {
            "valid": True,
            "pincode": pincode,
            "state": state,
            "lat": lat,
            "lon": lon,
            "display_name": f"{state}, India (PIN: {pincode})",
        }

    return {
        "valid": True,
        "pincode": pincode,
        "state": "India",
        "lat": 20.5937,
        "lon": 78.9629,
        "display_name": f"India (PIN: {pincode})",
    }


@location_router.get("/nearby-alerts")
async def get_nearby_alerts(lat: float = 28.6139, lon: float = 77.209, radius_km: float = 100):
    """Get alerts near a location."""
    from database import AsyncSessionLocal, Alert
    from sqlalchemy import select

    try:
        async with AsyncSessionLocal() as db:
            query = (
                select(Alert)
                .where(Alert.is_active == True, Alert.retracted == False)
                .order_by(Alert.created_at.desc())
                .limit(20)
            )
            result = await db.execute(query)
            alerts = result.scalars().all()

            return {
                "alerts": [
                    {
                        "id": a.id,
                        "type": a.alert_type,
                        "severity": a.severity,
                        "title": a.title,
                        "description": a.description,
                        "location": a.location,
                        "source": a.source,
                        "created_at": str(a.created_at),
                    }
                    for a in alerts
                ],
                "radius_km": radius_km,
            }
    except Exception as e:
        logger.error(f"Error fetching nearby alerts: {e}")
        return {"alerts": [], "radius_km": radius_km}
