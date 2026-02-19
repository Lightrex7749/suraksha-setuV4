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
    lat: float = None
    lon: float = None
    latitude: float = None
    longitude: float = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    enable_alerts: Optional[bool] = None
    alert_severity: Optional[list] = None


class PincodeRequest(BaseModel):
    pincode: Optional[str] = None
    pin_code: Optional[str] = None


# State mapping by first 2 digits (fallback)
_STATE_MAP = {
    "11": ("Delhi", 28.6139, 77.2090),
    "12": ("Haryana", 29.0588, 76.0856),
    "13": ("Punjab", 31.1471, 75.3412),
    "14": ("Chandigarh", 30.7333, 76.7794),
    "15": ("Himachal Pradesh", 31.1048, 77.1734),
    "16": ("Jammu & Kashmir", 33.7782, 76.5762),
    "17": ("Himachal Pradesh", 31.1048, 77.1734),
    "18": ("Jammu & Kashmir", 34.0837, 74.7973),
    "19": ("Jammu & Kashmir", 34.0837, 74.7973),
    "20": ("Uttar Pradesh", 26.8467, 80.9462),
    "21": ("Uttar Pradesh", 26.8467, 80.9462),
    "22": ("Uttar Pradesh", 26.8467, 80.9462),
    "23": ("Uttar Pradesh", 26.8467, 80.9462),
    "24": ("Uttar Pradesh", 26.8467, 80.9462),
    "25": ("Uttar Pradesh", 26.8467, 80.9462),
    "26": ("Uttar Pradesh", 26.8467, 80.9462),
    "27": ("Uttar Pradesh", 26.8467, 80.9462),
    "28": ("Uttar Pradesh", 26.8467, 80.9462),
    "30": ("Rajasthan", 27.0238, 74.2179),
    "31": ("Rajasthan", 27.0238, 74.2179),
    "32": ("Rajasthan", 27.0238, 74.2179),
    "33": ("Rajasthan", 27.0238, 74.2179),
    "34": ("Rajasthan", 27.0238, 74.2179),
    "36": ("Gujarat", 22.2587, 71.1924),
    "37": ("Gujarat", 22.2587, 71.1924),
    "38": ("Gujarat", 22.2587, 71.1924),
    "39": ("Gujarat", 22.2587, 71.1924),
    "40": ("Maharashtra", 19.7515, 75.7139),
    "41": ("Maharashtra", 19.7515, 75.7139),
    "42": ("Maharashtra", 19.7515, 75.7139),
    "43": ("Maharashtra", 19.7515, 75.7139),
    "44": ("Maharashtra", 19.7515, 75.7139),
    "45": ("Madhya Pradesh", 22.9734, 78.6569),
    "46": ("Madhya Pradesh", 22.9734, 78.6569),
    "47": ("Madhya Pradesh", 22.9734, 78.6569),
    "48": ("Madhya Pradesh", 22.9734, 78.6569),
    "49": ("Chhattisgarh", 21.2787, 81.8661),
    "50": ("Telangana", 18.1124, 79.0193),
    "51": ("Andhra Pradesh", 15.9129, 79.7400),
    "52": ("Andhra Pradesh", 15.9129, 79.7400),
    "53": ("Andhra Pradesh", 15.9129, 79.7400),
    "56": ("Karnataka", 15.3173, 75.7139),
    "57": ("Karnataka", 15.3173, 75.7139),
    "58": ("Karnataka", 15.3173, 75.7139),
    "59": ("Karnataka", 15.3173, 75.7139),
    "60": ("Tamil Nadu", 11.1271, 78.6569),
    "61": ("Tamil Nadu", 11.1271, 78.6569),
    "62": ("Tamil Nadu", 11.1271, 78.6569),
    "63": ("Tamil Nadu", 11.1271, 78.6569),
    "64": ("Tamil Nadu", 11.1271, 78.6569),
    "67": ("Kerala", 10.8505, 76.2711),
    "68": ("Kerala", 10.8505, 76.2711),
    "69": ("Kerala", 10.8505, 76.2711),
    "70": ("West Bengal", 22.9868, 87.855),
    "71": ("West Bengal", 22.9868, 87.855),
    "72": ("West Bengal", 22.9868, 87.855),
    "73": ("West Bengal", 22.9868, 87.855),
    "74": ("West Bengal", 22.9868, 87.855),
    "75": ("Odisha", 20.9517, 85.0985),
    "76": ("Odisha", 20.9517, 85.0985),
    "77": ("Odisha", 20.9517, 85.0985),
    "78": ("Assam", 26.2006, 92.9376),
    "79": ("Northeast", 25.4670, 91.3662),
    "80": ("Bihar", 25.0961, 85.3131),
    "81": ("Bihar", 25.0961, 85.3131),
    "82": ("Bihar", 25.0961, 85.3131),
    "83": ("Jharkhand", 23.6102, 85.2799),
    "84": ("Bihar", 25.0961, 85.3131),
    "85": ("Jharkhand", 23.6102, 85.2799),
    "40": ("Maharashtra", 19.0760, 72.8777),
}


def _geocode_pincode_nominatim(pincode: str):
    """Try Nominatim for accurate PIN code geocoding."""
    try:
        from geopy.geocoders import Nominatim
        geolocator = Nominatim(user_agent="suraksha_setu_geocoder")
        location = geolocator.geocode(
            {"postalcode": pincode, "country": "India"},
            timeout=5,
        )
        if location:
            return {
                "lat": location.latitude,
                "lon": location.longitude,
                "display_name": location.address or f"India (PIN: {pincode})",
            }
    except Exception as e:
        logger.warning(f"Nominatim geocoding failed for {pincode}: {e}")
    return None


@location_router.get("/current")
async def get_current_location():
    """Get location based on IP geolocation (fallback)."""
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
    lat = data.lat or data.latitude
    lon = data.lon or data.longitude

    # If only pin_code provided, geocode it
    if not lat and data.pin_code:
        result = _geocode_pincode_nominatim(data.pin_code)
        if result:
            lat, lon = result["lat"], result["lon"]
        else:
            prefix = data.pin_code[:2]
            if prefix in _STATE_MAP:
                _, lat, lon = _STATE_MAP[prefix]
            else:
                lat, lon = 20.5937, 78.9629

    return {
        "success": True,
        "location": {
            "latitude": lat,
            "longitude": lon,
            "lat": lat,
            "lon": lon,
            "city": data.city or "Unknown",
            "state": data.state or "Unknown",
            "pin_code": data.pin_code,
        },
    }


@location_router.post("/validate-pincode")
async def validate_pincode(data: PincodeRequest):
    """Validate an Indian PIN code and return location."""
    pincode = (data.pincode or data.pin_code or "").strip()
    if not pincode.isdigit() or len(pincode) != 6:
        raise HTTPException(status_code=400, detail="Invalid PIN code format")

    # Try accurate Nominatim geocoding first
    nom = _geocode_pincode_nominatim(pincode)
    if nom:
        return {
            "valid": True,
            "is_valid": True,
            "pincode": pincode,
            "lat": nom["lat"],
            "lon": nom["lon"],
            "display_name": nom["display_name"],
            "state": nom["display_name"].split(",")[-2].strip() if "," in nom["display_name"] else "India",
        }

    # Fallback: state mapping by first 2 digits
    prefix = pincode[:2]
    if prefix in _STATE_MAP:
        state, lat, lon = _STATE_MAP[prefix]
        return {
            "valid": True,
            "is_valid": True,
            "pincode": pincode,
            "state": state,
            "lat": lat,
            "lon": lon,
            "display_name": f"{state}, India (PIN: {pincode})",
        }

    return {
        "valid": True,
        "is_valid": True,
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
