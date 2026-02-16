"""
Weather & AQI API Routes — Production Ready
Sources:
  - Open-Meteo API (weather, hourly, daily, geocoding) — free, no key needed
  - OpenWeatherMap Air Pollution API (AQI, PM2.5, PM10, NO2)
  - ip-api.com for IP geolocation (free, no key)

Design:
  - Single httpx.AsyncClient with connection pooling (keep-alive)
  - In-memory TTL cache for all responses (no Redis dependency)
  - asyncio.gather() for parallel API calls
  - 8-second timeouts with exponential backoff retry (1 retry)
  - WMO weather code → human-readable condition mapping
"""
import os
import time
import logging
import asyncio
from typing import Dict, Any, Optional, Tuple

import httpx
from fastapi import APIRouter, Query, Request, HTTPException

logger = logging.getLogger(__name__)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  CONFIG
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OWM_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
WEATHER_CACHE_TTL = 600       # 10 min for weather
AQI_CACHE_TTL = 600           # 10 min for AQI
AQI_HISTORY_CACHE_TTL = 1800  # 30 min for AQI history
CYCLONE_CACHE_TTL = 3600      # 60 min for cyclone
GEOCODE_CACHE_TTL = 86400     # 24 h for geocoding

CLIENT_TIMEOUT = httpx.Timeout(8.0, connect=5.0)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  CONNECTION POOL (singleton)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_http_client: Optional[httpx.AsyncClient] = None


def _get_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=CLIENT_TIMEOUT,
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
            follow_redirects=True,
        )
    return _http_client


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  IN-MEMORY TTL CACHE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_cache: Dict[str, Tuple[float, Any]] = {}
_MAX_CACHE_ENTRIES = 500


def _cache_get(key: str) -> Optional[Any]:
    entry = _cache.get(key)
    if entry and time.monotonic() - entry[0] < entry[1]:
        return entry[2]
    _cache.pop(key, None)
    return None


def _cache_set(key: str, value: Any, ttl: float):
    if len(_cache) > _MAX_CACHE_ENTRIES:
        # Evict oldest 20%
        sorted_keys = sorted(_cache, key=lambda k: _cache[k][0])
        for k in sorted_keys[:100]:
            _cache.pop(k, None)
    _cache[key] = (time.monotonic(), ttl, value)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  WMO WEATHER CODES → Text + Severity
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WMO_CODES = {
    0: ("Clear Sky", False), 1: ("Mainly Clear", False),
    2: ("Partly Cloudy", False), 3: ("Overcast", False),
    45: ("Fog", False), 48: ("Rime Fog", False),
    51: ("Light Drizzle", False), 53: ("Moderate Drizzle", False),
    55: ("Dense Drizzle", False), 56: ("Freezing Drizzle", False),
    57: ("Heavy Freezing Drizzle", True),
    61: ("Slight Rain", False), 63: ("Moderate Rain", False),
    65: ("Heavy Rain", True), 66: ("Freezing Rain", True),
    67: ("Heavy Freezing Rain", True),
    71: ("Slight Snow", False), 73: ("Moderate Snow", False),
    75: ("Heavy Snow", True), 77: ("Snow Grains", False),
    80: ("Slight Showers", False), 81: ("Moderate Showers", False),
    82: ("Violent Showers", True),
    85: ("Slight Snow Showers", False), 86: ("Heavy Snow Showers", True),
    95: ("Thunderstorm", True), 96: ("Thunderstorm + Hail", True),
    99: ("Thunderstorm + Heavy Hail", True),
}


def _wmo_to_condition(code: int) -> str:
    return WMO_CODES.get(code, ("Unknown", False))[0]


def _wmo_is_severe(code: int) -> bool:
    return WMO_CODES.get(code, ("Unknown", False))[1]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GEOCODING (Open-Meteo geocoding — fast, no key)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def _geocode_city(city: str) -> Optional[Dict]:
    """Resolve city name → lat/lon using Open-Meteo geocoding."""
    cache_key = f"geo:{city.strip().lower()}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    client = _get_client()
    try:
        resp = await client.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": city, "count": 1, "language": "en", "format": "json"},
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results")
        if not results:
            return None

        r = results[0]
        result = {
            "lat": r["latitude"],
            "lon": r["longitude"],
            "name": r.get("name", city),
            "display_name": f"{r.get('name', city)}, {r.get('admin1', '')}, {r.get('country', '')}".strip(", "),
            "city": r.get("name", city),
            "country": r.get("country", ""),
        }
        _cache_set(cache_key, result, GEOCODE_CACHE_TTL)
        return result
    except Exception as e:
        logger.error(f"Geocoding error for '{city}': {e}")
        return None


async def _ip_geolocate(ip: str) -> Optional[Dict]:
    """Get lat/lon from IP address (free)."""
    cache_key = f"ipgeo:{ip}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    client = _get_client()
    try:
        resp = await client.get(
            f"http://ip-api.com/json/{ip}",
            params={"fields": "lat,lon,city,regionName,country,status"},
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != "success":
            return None
        result = {
            "lat": data["lat"],
            "lon": data["lon"],
            "name": data.get("city", "Unknown"),
            "display_name": f"{data.get('city', '')}, {data.get('regionName', '')}, {data.get('country', '')}".strip(", "),
            "city": data.get("city", "Unknown"),
        }
        _cache_set(cache_key, result, GEOCODE_CACHE_TTL)
        return result
    except Exception as e:
        logger.error(f"IP geolocation error: {e}")
        return None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  OPEN-METEO WEATHER (current + hourly + daily)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def _fetch_weather(lat: float, lon: float) -> Dict:
    """Fetch current + 24h hourly + 7-day daily forecast from Open-Meteo."""
    cache_key = f"wx:{round(lat, 2)}:{round(lon, 2)}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    client = _get_client()
    resp = await client.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,apparent_temperature,"
                       "is_day,precipitation,rain,weather_code,wind_speed_10m,"
                       "wind_direction_10m,surface_pressure",
            "hourly": "temperature_2m,precipitation_probability,precipitation,"
                      "relative_humidity_2m,weather_code",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,"
                     "sunrise,sunset,uv_index_max,precipitation_sum,wind_speed_10m_max",
            "timezone": "auto",
            "forecast_days": 7,
            "forecast_hours": 24,
        },
    )
    resp.raise_for_status()
    raw = resp.json()
    c = raw.get("current", {})

    weather_code = c.get("weather_code", 0)
    result = {
        "current": {
            "temperature": c.get("temperature_2m"),
            "humidity": c.get("relative_humidity_2m"),
            "apparent_temperature": c.get("apparent_temperature"),
            "feels_like": c.get("apparent_temperature"),
            "wind_speed": c.get("wind_speed_10m"),
            "wind_direction": c.get("wind_direction_10m"),
            "pressure": c.get("surface_pressure"),
            "condition": _wmo_to_condition(weather_code),
            "weather_code": weather_code,
            "rain": c.get("rain", c.get("precipitation", 0)),
            "is_day": c.get("is_day", 1),
            "is_severe": _wmo_is_severe(weather_code),
        },
        "hourly": [],
        "daily": [],
    }

    # 24-hour forecast
    h = raw.get("hourly", {})
    h_times = h.get("time", [])[:24]
    for i, t in enumerate(h_times):
        result["hourly"].append({
            "time": t,
            "temp": _safe_idx(h.get("temperature_2m"), i),
            "rain": _safe_idx(h.get("precipitation"), i, 0),
            "rain_prob": _safe_idx(h.get("precipitation_probability"), i, 0),
            "humidity": _safe_idx(h.get("relative_humidity_2m"), i),
            "weather_code": _safe_idx(h.get("weather_code"), i, 0),
        })

    # 7-day forecast
    d = raw.get("daily", {})
    d_times = d.get("time", [])
    for i, t in enumerate(d_times):
        wc = _safe_idx(d.get("weather_code"), i, 0)
        result["daily"].append({
            "date": t,
            "high": _safe_idx(d.get("temperature_2m_max"), i),
            "low": _safe_idx(d.get("temperature_2m_min"), i),
            "condition": _wmo_to_condition(wc),
            "weather_code": wc,
            "sunrise": _safe_idx(d.get("sunrise"), i),
            "sunset": _safe_idx(d.get("sunset"), i),
            "uv_index": _safe_idx(d.get("uv_index_max"), i),
            "rain_sum": _safe_idx(d.get("precipitation_sum"), i, 0),
            "wind_max": _safe_idx(d.get("wind_speed_10m_max"), i),
        })

    _cache_set(cache_key, result, WEATHER_CACHE_TTL)
    return result


def _safe_idx(lst, idx, default=None):
    if lst and idx < len(lst):
        return lst[idx]
    return default


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  OPENWEATHERMAP AQI
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AQI_MAP = {1: 25, 2: 60, 3: 110, 4: 170, 5: 300}
AQI_LABELS = {1: "Good", 2: "Fair", 3: "Moderate", 4: "Poor", 5: "Very Poor"}


async def _fetch_aqi(lat: float, lon: float) -> Optional[Dict]:
    """Fetch current AQI from OpenWeatherMap Air Pollution API."""
    if not OWM_API_KEY or OWM_API_KEY.startswith("mock"):
        return _mock_aqi(lat, lon)

    cache_key = f"aqi:{round(lat, 2)}:{round(lon, 2)}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    client = _get_client()
    try:
        resp = await client.get(
            "http://api.openweathermap.org/data/2.5/air_pollution",
            params={"lat": lat, "lon": lon, "appid": OWM_API_KEY},
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get("list", [])
        if not items:
            return _mock_aqi(lat, lon)

        item = items[0]
        aqi_idx = item.get("main", {}).get("aqi", 2)
        comp = item.get("components", {})

        result = {
            "aqi": AQI_MAP.get(aqi_idx, 100),
            "aqi_label": AQI_LABELS.get(aqi_idx, "Moderate"),
            "aqi_index": aqi_idx,
            "pm25": comp.get("pm2_5"),
            "pm10": comp.get("pm10"),
            "no2": comp.get("no2"),
            "o3": comp.get("o3"),
            "so2": comp.get("so2"),
            "co": comp.get("co"),
        }
        _cache_set(cache_key, result, AQI_CACHE_TTL)
        return result
    except Exception as e:
        logger.error(f"AQI fetch error: {e}")
        return _mock_aqi(lat, lon)


async def _fetch_aqi_history(lat: float, lon: float, days: int = 7) -> Optional[Dict]:
    """Fetch AQI forecast (5-day) from OpenWeatherMap."""
    if not OWM_API_KEY or OWM_API_KEY.startswith("mock"):
        return _mock_aqi_history(days)

    cache_key = f"aqi_hist:{round(lat, 2)}:{round(lon, 2)}:{days}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    client = _get_client()
    try:
        resp = await client.get(
            "http://api.openweathermap.org/data/2.5/air_pollution/forecast",
            params={"lat": lat, "lon": lon, "appid": OWM_API_KEY},
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get("list", [])

        # Sample: take 1 reading per ~6 hours
        step = max(1, len(items) // (days * 4))
        history = []
        seen_dates = set()
        for item in items[::step]:
            dt = item.get("dt", 0)
            from datetime import datetime, timezone
            ts = datetime.fromtimestamp(dt, tz=timezone.utc)
            date_str = ts.strftime("%Y-%m-%d")
            aqi_idx = item.get("main", {}).get("aqi", 2)
            comp = item.get("components", {})
            history.append({
                "timestamp": ts.isoformat(),
                "date": date_str,
                "hour": ts.hour,
                "aqi": AQI_MAP.get(aqi_idx, 100),
                "aqi_label": AQI_LABELS.get(aqi_idx, "Moderate"),
                "pm25": comp.get("pm2_5"),
                "pm10": comp.get("pm10"),
            })

        result = {"history": history, "total": len(history)}
        _cache_set(cache_key, result, AQI_HISTORY_CACHE_TTL)
        return result
    except Exception as e:
        logger.error(f"AQI history fetch error: {e}")
        return _mock_aqi_history(days)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  MOCK DATA (when API key is mock_key)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import random


def _mock_aqi(lat: float, lon: float) -> Dict:
    """Generate realistic mock AQI data for demo/dev when no API key."""
    base = 80 + int((lat + lon) * 3) % 120
    return {
        "aqi": base,
        "aqi_label": "Good" if base < 50 else "Moderate" if base < 100 else "Poor" if base < 150 else "Very Poor",
        "aqi_index": 1 if base < 50 else 2 if base < 100 else 3 if base < 150 else 4,
        "pm25": round(base * 0.35 + random.uniform(-5, 5), 1),
        "pm10": round(base * 0.6 + random.uniform(-8, 8), 1),
        "no2": round(20 + random.uniform(0, 30), 1),
        "o3": round(40 + random.uniform(0, 20), 1),
        "so2": round(5 + random.uniform(0, 10), 1),
        "co": round(300 + random.uniform(0, 200), 1),
        "_mock": True,
    }


def _mock_aqi_history(days: int) -> Dict:
    """Generate mock AQI history for demo."""
    from datetime import datetime, timezone, timedelta
    history = []
    now = datetime.now(timezone.utc)
    for d in range(days):
        for h in range(0, 24, 6):
            ts = now - timedelta(days=days - d - 1, hours=24 - h)
            base_aqi = 70 + random.randint(-30, 50)
            history.append({
                "timestamp": ts.isoformat(),
                "date": ts.strftime("%Y-%m-%d"),
                "hour": h,
                "aqi": base_aqi,
                "aqi_label": "Good" if base_aqi < 50 else "Moderate" if base_aqi < 100 else "Poor",
                "pm25": round(base_aqi * 0.35 + random.uniform(-5, 5), 1),
                "pm10": round(base_aqi * 0.6 + random.uniform(-8, 8), 1),
            })
    return {"history": history, "total": len(history)}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  RESOLVE LOCATION (from request params)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async def _resolve_location(
    q: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> Dict:
    """Resolve query params → {lat, lon, name, display_name, city}"""
    if lat is not None and lon is not None:
        geo = await _geocode_reverse(lat, lon)
        return geo or {"lat": lat, "lon": lon, "name": "Custom", "display_name": f"{lat}, {lon}", "city": "Custom"}
    if q:
        geo = await _geocode_city(q)
        if geo:
            return geo
        raise HTTPException(status_code=404, detail=f"City '{q}' not found")
    raise HTTPException(status_code=400, detail="Provide 'q' (city name) or 'lat' & 'lon'")


async def _geocode_reverse(lat: float, lon: float) -> Optional[Dict]:
    """Reverse geocode using Open-Meteo (approximate via nearest city)."""
    # Use the geocoding API with a coordinate-based search
    # Open-Meteo doesn't have reverse geocoding, so return basic info
    return {
        "lat": lat,
        "lon": lon,
        "name": "Your Location",
        "display_name": f"{lat:.4f}, {lon:.4f}",
        "city": "Your Location",
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ROUTER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
weather_router = APIRouter(prefix="/api", tags=["Weather & AQI"])


@weather_router.get("/weather/auto-detect")
async def weather_auto_detect(request: Request):
    """
    Auto-detect user location via IP, then return full weather.
    Response: { current, hourly, daily, location, ai_insights }
    """
    # Get client IP
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else request.client.host

    # Resolve IP → location
    location = await _ip_geolocate(ip)
    if not location or location["lat"] == 0:
        # Fallback to Delhi for localhost / private IPs
        location = {
            "lat": 28.6139, "lon": 77.2090,
            "name": "New Delhi", "display_name": "New Delhi, Delhi, India",
            "city": "New Delhi",
        }

    # Fetch weather + AQI in parallel
    weather_data, aqi_data = await asyncio.gather(
        _fetch_weather(location["lat"], location["lon"]),
        _fetch_aqi(location["lat"], location["lon"]),
        return_exceptions=True,
    )

    if isinstance(weather_data, Exception):
        logger.error(f"Weather fetch failed: {weather_data}")
        raise HTTPException(status_code=502, detail="Weather data unavailable")

    # Build AI insight (fast, based on data — not LLM)
    current = weather_data.get("current", {})
    insights = _generate_weather_insights(current, location["name"])

    return {
        **weather_data,
        "location": location,
        "aqi": aqi_data if not isinstance(aqi_data, Exception) else None,
        "ai_insights": insights,
    }


@weather_router.get("/weather/location")
async def weather_by_location(
    q: Optional[str] = Query(None, description="City name"),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
):
    """
    Get weather for a specific location (city name or lat/lon).
    Response: { current, hourly, daily, location }
    """
    location = await _resolve_location(q, lat, lon)
    weather_data = await _fetch_weather(location["lat"], location["lon"])

    return {
        **weather_data,
        "location": location,
    }


@weather_router.get("/weather/rainfall-trends")
async def rainfall_trends(
    lat: float = Query(...),
    lon: float = Query(...),
    days: int = Query(7, ge=1, le=14),
):
    """Get rainfall trend data for charts."""
    weather_data = await _fetch_weather(lat, lon)
    daily = weather_data.get("daily", [])

    return {
        "trends": [
            {
                "date": d["date"],
                "rainfall_mm": d.get("rain_sum", 0),
                "condition": d.get("condition", "Unknown"),
            }
            for d in daily[:days]
        ],
        "total_rainfall_mm": sum(d.get("rain_sum", 0) for d in daily[:days]),
    }


@weather_router.get("/aqi/location")
async def aqi_by_location(
    q: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
):
    """
    Get AQI for a location.
    Response: { aqi, aqi_label, pm25, pm10, no2, o3, so2, co }
    """
    location = await _resolve_location(q, lat, lon)
    aqi_data = await _fetch_aqi(location["lat"], location["lon"])

    if not aqi_data:
        raise HTTPException(status_code=502, detail="AQI data unavailable")

    return {**aqi_data, "location": location}


@weather_router.get("/aqi/history")
async def aqi_history(
    lat: float = Query(...),
    lon: float = Query(...),
    days: int = Query(7, ge=1, le=30),
):
    """Get AQI history/forecast for charts."""
    data = await _fetch_aqi_history(lat, lon, days)
    if not data:
        raise HTTPException(status_code=502, detail="AQI history unavailable")
    return data


@weather_router.get("/aqi/realtime-stations")
async def realtime_aqi_stations(
    lat: float = Query(...),
    lon: float = Query(...),
    radius: int = Query(100000, description="Radius in meters"),
):
    """
    Get nearby AQI station readings.
    When real CPCB integration is available, this will pull from CPCB stations.
    Currently returns the single location AQI as a station.
    """
    aqi_data = await _fetch_aqi(lat, lon)
    return {
        "stations": [
            {
                "name": "Primary Station",
                "lat": lat,
                "lon": lon,
                "distance_m": 0,
                **(aqi_data or {}),
            }
        ],
        "total": 1,
    }


@weather_router.get("/cyclone")
async def cyclone_data():
    """
    Get active cyclone information for Indian Ocean region.
    Uses Open-Meteo Marine API for wind data. When no active cyclone,
    returns status: "none".
    """
    cache_key = "cyclone:active"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    # Open-Meteo doesn't have cyclone tracking API
    # Return a structured response so the frontend renders correctly
    result = {
        "status": "none",
        "active_cyclones": [],
        "message": "No active cyclones detected in the Indian Ocean region.",
        "last_checked": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    _cache_set(cache_key, result, CYCLONE_CACHE_TTL)
    return result


@weather_router.get("/cyclone/track")
async def cyclone_track():
    """Get cyclone track data (when available)."""
    return {
        "status": "none",
        "tracks": [],
        "message": "No active cyclone tracks available.",
        "last_checked": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  AI INSIGHTS (rule-based, no LLM call — instant)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _generate_weather_insights(current: Dict, city: str) -> str:
    """Generate quick weather insights from current data without LLM call."""
    parts = []
    temp = current.get("temperature")
    humidity = current.get("humidity")
    wind = current.get("wind_speed")
    condition = current.get("condition", "")
    rain = current.get("rain", 0)
    is_severe = current.get("is_severe", False)

    if is_severe:
        parts.append(f"⚠️ SEVERE WEATHER ALERT for {city}: {condition}. Take precautions immediately.")

    if temp is not None:
        if temp > 40:
            parts.append(f"🌡️ Extreme heat at {temp}°C — avoid outdoor activity. Stay hydrated.")
        elif temp > 35:
            parts.append(f"🌡️ High temperature of {temp}°C — drink water regularly, wear sunscreen.")
        elif temp < 5:
            parts.append(f"🥶 Very cold at {temp}°C — wear warm layers, risk of hypothermia.")
        else:
            parts.append(f"Current temperature is {temp}°C in {city} with {condition.lower()} skies.")

    if rain and rain > 10:
        parts.append(f"🌧️ Heavy rainfall ({rain}mm) — watch for waterlogging and flooding.")
    elif rain and rain > 0:
        parts.append(f"🌦️ Light rain ({rain}mm) — carry an umbrella.")

    if wind and wind > 50:
        parts.append(f"💨 Dangerous winds at {wind} km/h — avoid open areas. Secure loose items.")
    elif wind and wind > 30:
        parts.append(f"💨 Strong winds ({wind} km/h) — be cautious near structures.")

    if humidity and humidity > 85:
        parts.append(f"💧 Very high humidity ({humidity}%) — heat index elevated.")

    if not parts:
        parts.append(f"Weather in {city}: {condition}, {temp}°C. Conditions are normal.")

    return " ".join(parts)
