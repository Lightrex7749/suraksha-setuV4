from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import json
import google.generativeai as genai
from passlib.context import CryptContext
import jwt
import httpx
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# In-memory storage (replace with MongoDB in production)
in_memory_db = {
    "users": {},
    "chat_messages": [],
    "community_reports": [],
    "status_checks": []
}

# MongoDB connection (optional - for future use)
mongo_url = os.environ.get('MONGO_URL')
if mongo_url:
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'suraksha_setu')]
    use_mongo = True
else:
    client = None
    db = None
    use_mongo = False
    logging.warning("MongoDB not configured. Using in-memory storage.")

# Configure Gemini AI
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    # Using gemini-1.5-flash for better performance
    gemini_model = genai.GenerativeModel('gemini-1.5-flash')
else:
    gemini_model = None
    logging.warning("Gemini API key not found. AI features will be disabled.")

# Security configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production-12345678')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI(title="Suraksha Setu API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Load mock data
MOCK_DATA_DIR = ROOT_DIR / 'mock_data'

def load_json_file(filename: str):
    """Helper function to load JSON mock data files"""
    try:
        file_path = MOCK_DATA_DIR / filename
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Error loading {filename}: {str(e)}")
        return None

# Initialize geocoder
geolocator = Nominatim(user_agent="suraksha_setu_app")

# API Integration Utilities
async def geocode_location(location_name: str):
    """Convert city/location name to coordinates"""
    try:
        location = geolocator.geocode(location_name, timeout=10)
        if location:
            return {
                "lat": location.latitude,
                "lon": location.longitude,
                "display_name": location.address
            }
        return None
    except (GeocoderTimedOut, GeocoderServiceError) as e:
        logging.error(f"Geocoding error: {str(e)}")
        return None

async def fetch_open_meteo_weather(lat: float, lon: float):
    """Fetch weather data from Open-Meteo API"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Current weather and hourly forecast
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weathercode,cloudcover,windspeed_10m,winddirection_10m,pressure_msl",
                "hourly": "temperature_2m,precipitation_probability,precipitation,rain,weathercode",
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,weathercode,precipitation_probability_max",
                "timezone": "auto",
                "forecast_days": 7
            }
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logging.error(f"Open-Meteo API error: {str(e)}")
        return None

async def fetch_openaq_data(lat: float, lon: float, radius: int = 50000):
    """Fetch air quality data from OpenAQ API"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # OpenAQ v3 API
            url = "https://api.openaq.org/v3/locations"
            params = {
                "coordinates": f"{lat},{lon}",
                "radius": radius,
                "limit": 10,
                "order_by": "distance"
            }
            headers = {
                "Accept": "application/json"
            }
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logging.error(f"OpenAQ API error: {str(e)}")
        return None

def get_weather_condition(weathercode: int) -> str:
    """Convert WMO weather code to readable condition"""
    weather_codes = {
        0: "Clear Sky",
        1: "Mainly Clear",
        2: "Partly Cloudy",
        3: "Overcast",
        45: "Foggy",
        48: "Depositing Rime Fog",
        51: "Light Drizzle",
        53: "Moderate Drizzle",
        55: "Dense Drizzle",
        61: "Slight Rain",
        63: "Moderate Rain",
        65: "Heavy Rain",
        71: "Slight Snow",
        73: "Moderate Snow",
        75: "Heavy Snow",
        77: "Snow Grains",
        80: "Slight Rain Showers",
        81: "Moderate Rain Showers",
        82: "Violent Rain Showers",
        85: "Slight Snow Showers",
        86: "Heavy Snow Showers",
        95: "Thunderstorm",
        96: "Thunderstorm with Slight Hail",
        99: "Thunderstorm with Heavy Hail"
    }
    return weather_codes.get(weathercode, "Unknown")

def calculate_aqi_from_pollutants(pollutants: Dict[str, float]) -> Dict[str, Any]:
    """Calculate AQI and category from pollutant values"""
    # Simplified AQI calculation based on PM2.5 (US EPA standard)
    pm25 = pollutants.get("pm25", 0)
    
    if pm25 <= 12:
        aqi = (50 / 12) * pm25
        category = "Good"
        color = "#00e400"
    elif pm25 <= 35.4:
        aqi = ((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51
        category = "Moderate"
        color = "#ffff00"
    elif pm25 <= 55.4:
        aqi = ((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5) + 101
        category = "Unhealthy for Sensitive Groups"
        color = "#ff7e00"
    elif pm25 <= 150.4:
        aqi = ((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5) + 151
        category = "Unhealthy"
        color = "#ff0000"
    elif pm25 <= 250.4:
        aqi = ((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5) + 201
        category = "Very Unhealthy"
        color = "#8f3f97"
    else:
        aqi = ((500 - 301) / (500.4 - 250.5)) * (pm25 - 250.5) + 301
        category = "Hazardous"
        color = "#7e0023"
    
    return {
        "aqi": int(aqi),
        "category": category,
        "color": color
    }

# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class AIQueryRequest(BaseModel):
    query: str
    context: Optional[str] = None

class ChatbotMessageRequest(BaseModel):
    message: str
    session_id: str
    user_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_id: Optional[str] = None
    message: str
    response: str
    context: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    isUser: bool = False

class CommunityReportCreate(BaseModel):
    reporter_name: str
    location: str
    report_type: str
    description: str
    severity: str
    coordinates: Optional[Dict[str, float]] = None

class CommunityReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reporter_name: str
    location: str
    report_type: str
    description: str
    severity: str
    coordinates: Optional[Dict[str, float]] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "pending"

# ==================== AUTHENTICATION MODELS ====================

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    user_type: str  # student, scientist, admin, citizen

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    user_type: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# ==================== AUTHENTICATION UTILITIES ====================

def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current user from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    # Get user from in-memory storage
    user_doc = in_memory_db["users"].get(user_id)
    if user_doc is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Return user without password
    user_data = {k: v for k, v in user_doc.items() if k != 'password'}
    if isinstance(user_data.get('created_at'), str):
        user_data['created_at'] = datetime.fromisoformat(user_data['created_at'])
    
    return User(**user_data)

# ==================== AUTHENTICATION ENDPOINTS ====================

@api_router.post("/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user"""
    # Validate user type
    valid_types = ["student", "scientist", "admin", "citizen"]
    if user_data.user_type.lower() not in valid_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid user type. Must be one of: {', '.join(valid_types)}"
        )
    
    # Check if user already exists
    existing_user = any(u.get('email') == user_data.email for u in in_memory_db["users"].values())
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user document
    user = User(
        name=user_data.name,
        email=user_data.email,
        user_type=user_data.user_type.lower()
    )
    
    user_doc = user.model_dump()
    user_doc['password'] = hash_password(user_data.password)
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    
    # Store in memory
    in_memory_db["users"][user.id] = user_doc
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login user and return JWT token"""
    # Find user by email in memory
    user_doc = None
    for uid, user in in_memory_db["users"].items():
        if user.get('email') == credentials.email:
            user_doc = user
            break
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create user object (without password)
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(
        id=user_doc['id'],
        name=user_doc['name'],
        email=user_doc['email'],
        user_type=user_doc['user_type'],
        created_at=user_doc['created_at']
    )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return current_user

# ==================== BASIC ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {
        "message": "Suraksha Setu API v1.0",
        "status": "operational",
        "endpoints": {
            "weather": "/api/weather",
            "alerts": "/api/alerts",
            "disasters": "/api/disasters",
            "cyclone": "/api/cyclone",
            "aqi": "/api/aqi",
            "flood-zones": "/api/flood-zones",
            "earthquakes": "/api/earthquakes",
            "agriculture": "/api/agriculture",
            "knowledge-cards": "/api/knowledge-cards",
            "evacuation-centers": "/api/evacuation-centers",
            "ai-assistant": "/api/ai-assistant",
            "community-reports": "/api/community-reports"
        }
    }

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# ==================== WEATHER ENDPOINTS ====================

@api_router.get("/weather")
async def get_weather():
    """Get current weather data and forecasts"""
    data = load_json_file('weather_data.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load weather data")
    return data

@api_router.get("/weather/current")
async def get_current_weather():
    """Get only current weather conditions"""
    data = load_json_file('weather_data.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load weather data")
    return data.get('current', {})

@api_router.get("/weather/hourly")
async def get_hourly_forecast():
    """Get hourly weather forecast"""
    data = load_json_file('weather_data.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load weather data")
    return data.get('hourly', [])

@api_router.get("/weather/daily")
async def get_daily_forecast():
    """Get daily weather forecast"""
    data = load_json_file('weather_data.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load weather data")
    return data.get('daily', [])

# ==================== LOCATION-BASED WEATHER ENDPOINTS ====================

@api_router.get("/weather/location")
async def get_weather_by_location(
    q: Optional[str] = Query(None, description="City or location name"),
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude")
):
    """Get weather data for a specific location using Open-Meteo API"""
    
    # Determine coordinates
    if lat is not None and lon is not None:
        coordinates = {"lat": lat, "lon": lon, "display_name": f"{lat}, {lon}"}
    elif q:
        coordinates = await geocode_location(q)
        if not coordinates:
            raise HTTPException(status_code=404, detail=f"Location '{q}' not found")
    else:
        raise HTTPException(status_code=400, detail="Either 'q' (location name) or 'lat' and 'lon' must be provided")
    
    # Fetch weather data from Open-Meteo
    weather_data = await fetch_open_meteo_weather(coordinates["lat"], coordinates["lon"])
    
    if not weather_data:
        # Fallback to mock data
        logging.warning("Open-Meteo API failed, using mock data")
        mock_data = load_json_file('weather_data.json')
        if mock_data:
            mock_data['current']['location'] = coordinates.get("display_name", "Unknown")
            mock_data['current']['coordinates'] = {"lat": coordinates["lat"], "lon": coordinates["lon"]}
            return mock_data
        raise HTTPException(status_code=503, detail="Weather service temporarily unavailable")
    
    # Transform Open-Meteo data to our format
    current = weather_data.get('current', {})
    hourly = weather_data.get('hourly', {})
    daily = weather_data.get('daily', {})
    
    # Process current weather
    current_weather = {
        "location": coordinates.get("display_name", "Unknown"),
        "coordinates": {"lat": coordinates["lat"], "lon": coordinates["lon"]},
        "temperature": int(current.get('temperature_2m', 0)),
        "feels_like": int(current.get('apparent_temperature', 0)),
        "condition": get_weather_condition(current.get('weathercode', 0)),
        "humidity": int(current.get('relative_humidity_2m', 0)),
        "wind_speed": int(current.get('windspeed_10m', 0)),
        "wind_direction": int(current.get('winddirection_10m', 0)),
        "pressure": int(current.get('pressure_msl', 0)),
        "cloud_cover": int(current.get('cloudcover', 0)),
        "rain": current.get('rain', 0),
        "precipitation": current.get('precipitation', 0),
        "last_updated": current.get('time', datetime.now(timezone.utc).isoformat())
    }
    
    # Process hourly forecast (next 24 hours)
    hourly_forecast = []
    if hourly and 'time' in hourly:
        for i in range(min(24, len(hourly['time']))):
            hour_time = hourly['time'][i] if i < len(hourly['time']) else None
            if hour_time:
                hourly_forecast.append({
                    "time": hour_time,
                    "temp": int(hourly['temperature_2m'][i]) if i < len(hourly.get('temperature_2m', [])) else 0,
                    "condition": get_weather_condition(hourly['weathercode'][i]) if i < len(hourly.get('weathercode', [])) else "Unknown",
                    "rain": int(hourly['precipitation_probability'][i]) if i < len(hourly.get('precipitation_probability', [])) else 0,
                    "precipitation": hourly['precipitation'][i] if i < len(hourly.get('precipitation', [])) else 0
                })
    
    # Process daily forecast
    daily_forecast = []
    if daily and 'time' in daily:
        for i in range(min(7, len(daily['time']))):
            day_time = daily['time'][i] if i < len(daily['time']) else None
            if day_time:
                daily_forecast.append({
                    "date": day_time,
                    "high": int(daily['temperature_2m_max'][i]) if i < len(daily.get('temperature_2m_max', [])) else 0,
                    "low": int(daily['temperature_2m_min'][i]) if i < len(daily.get('temperature_2m_min', [])) else 0,
                    "condition": get_weather_condition(daily['weathercode'][i]) if i < len(daily.get('weathercode', [])) else "Unknown",
                    "rain": int(daily['precipitation_probability_max'][i]) if i < len(daily.get('precipitation_probability_max', [])) else 0,
                    "precipitation": daily['precipitation_sum'][i] if i < len(daily.get('precipitation_sum', [])) else 0
                })
    
    return {
        "current": current_weather,
        "hourly": hourly_forecast,
        "daily": daily_forecast,
        "source": "open-meteo"
    }

@api_router.get("/weather/rainfall-trends")
async def get_rainfall_trends(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    days: int = Query(7, ge=1, le=16, description="Number of days for forecast")
):
    """Get rainfall trend data for visualization"""
    
    weather_data = await fetch_open_meteo_weather(lat, lon)
    
    if not weather_data:
        raise HTTPException(status_code=503, detail="Weather service temporarily unavailable")
    
    daily = weather_data.get('daily', {})
    hourly = weather_data.get('hourly', {})
    
    # Daily rainfall trends
    daily_trends = []
    if daily and 'time' in daily:
        for i in range(min(days, len(daily['time']))):
            daily_trends.append({
                "date": daily['time'][i],
                "rainfall": daily['rain_sum'][i] if i < len(daily.get('rain_sum', [])) else 0,
                "precipitation": daily['precipitation_sum'][i] if i < len(daily.get('precipitation_sum', [])) else 0,
                "probability": daily['precipitation_probability_max'][i] if i < len(daily.get('precipitation_probability_max', [])) else 0
            })
    
    # Hourly rainfall for next 48 hours
    hourly_trends = []
    if hourly and 'time' in hourly:
        for i in range(min(48, len(hourly['time']))):
            hourly_trends.append({
                "time": hourly['time'][i],
                "rainfall": hourly['rain'][i] if i < len(hourly.get('rain', [])) else 0,
                "precipitation": hourly['precipitation'][i] if i < len(hourly.get('precipitation', [])) else 0,
                "probability": hourly['precipitation_probability'][i] if i < len(hourly.get('precipitation_probability', [])) else 0
            })
    
    return {
        "daily_trends": daily_trends,
        "hourly_trends": hourly_trends,
        "coordinates": {"lat": lat, "lon": lon}
    }

# ==================== ALERTS ENDPOINTS ====================

@api_router.get("/alerts")
async def get_alerts(severity: Optional[str] = None):
    """Get all active alerts, optionally filter by severity (red/orange/yellow)"""
    data = load_json_file('alerts.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load alerts data")
    
    if severity:
        data = [alert for alert in data if alert.get('severity', '').lower() == severity.lower()]
    
    return data

@api_router.get("/alerts/{alert_id}")
async def get_alert_by_id(alert_id: str):
    """Get specific alert by ID"""
    data = load_json_file('alerts.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load alerts data")
    
    alert = next((a for a in data if a.get('id') == alert_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return alert

# ==================== AQI ENDPOINTS ====================

@api_router.get("/aqi")
async def get_aqi():
    """Get comprehensive AQI data including current, stations, historical, and forecast"""
    data = load_json_file('aqi_data.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load AQI data")
    return data

@api_router.get("/aqi/current")
async def get_current_aqi():
    """Get current AQI data"""
    data = load_json_file('aqi_data.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load AQI data")
    return data.get('current', {})

@api_router.get("/aqi/stations")
async def get_aqi_stations():
    """Get AQI data from all monitoring stations"""
    data = load_json_file('aqi_data.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load AQI data")
    return data.get('stations', [])

@api_router.get("/aqi/historical")
async def get_aqi_historical():
    """Get historical AQI trends"""
    data = load_json_file('aqi_data.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load AQI data")
    return data.get('historical', [])

@api_router.get("/aqi/forecast")
async def get_aqi_forecast():
    """Get AQI forecast"""
    data = load_json_file('aqi_data.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load AQI data")
    return data.get('forecast', [])

# ==================== LOCATION-BASED AQI ENDPOINTS ====================

@api_router.get("/aqi/location")
async def get_aqi_by_location(
    q: Optional[str] = Query(None, description="City or location name"),
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude"),
    radius: int = Query(50000, description="Search radius in meters")
):
    """Get real-time AQI data for a specific location using OpenAQ API"""
    
    # Determine coordinates
    if lat is not None and lon is not None:
        coordinates = {"lat": lat, "lon": lon}
    elif q:
        coordinates = await geocode_location(q)
        if not coordinates:
            raise HTTPException(status_code=404, detail=f"Location '{q}' not found")
    else:
        raise HTTPException(status_code=400, detail="Either 'q' (location name) or 'lat' and 'lon' must be provided")
    
    # Fetch AQI data from OpenAQ
    aqi_data = await fetch_openaq_data(coordinates["lat"], coordinates["lon"], radius)
    
    if not aqi_data or not aqi_data.get('results'):
        # Fallback to mock data
        logging.warning("OpenAQ API failed or no stations found, using mock data")
        mock_data = load_json_file('aqi_data.json')
        if mock_data:
            mock_data['current']['location'] = coordinates.get("display_name", "Unknown")
            mock_data['source'] = "mock"
            return mock_data
        raise HTTPException(status_code=503, detail="AQI service temporarily unavailable")
    
    # Process OpenAQ data
    stations = []
    all_measurements = {}
    
    for location in aqi_data.get('results', [])[:10]:
        station_name = location.get('name', 'Unknown Station')
        station_coords = location.get('coordinates', {})
        
        # Get latest measurements
        if 'measurements' in location or 'parameters' in location:
            measurements = location.get('measurements', []) or location.get('parameters', [])
            
            station_pollutants = {}
            for measurement in measurements:
                parameter = measurement.get('parameter', '')
                value = measurement.get('value') or measurement.get('lastValue', 0)
                
                if parameter in ['pm25', 'pm2.5', 'pm10', 'no2', 'so2', 'co', 'o3']:
                    param_key = parameter.replace('.', '')
                    station_pollutants[param_key] = value
                    
                    # Aggregate for overall location
                    if param_key not in all_measurements:
                        all_measurements[param_key] = []
                    all_measurements[param_key].append(value)
            
            # Calculate station AQI
            if 'pm25' in station_pollutants or 'pm2.5' in station_pollutants:
                pm25_value = station_pollutants.get('pm25', station_pollutants.get('pm2.5', 0))
                aqi_info = calculate_aqi_from_pollutants({"pm25": pm25_value})
                
                stations.append({
                    "name": station_name,
                    "aqi": aqi_info['aqi'],
                    "category": aqi_info['category'],
                    "lat": station_coords.get('latitude'),
                    "lon": station_coords.get('longitude'),
                    "pollutants": station_pollutants
                })
    
    # Calculate overall AQI from average
    overall_pollutants = {}
    for param, values in all_measurements.items():
        if values:
            overall_pollutants[param] = sum(values) / len(values)
    
    overall_aqi_info = calculate_aqi_from_pollutants(overall_pollutants)
    
    return {
        "current": {
            "location": coordinates.get("display_name", "Unknown"),
            "aqi": overall_aqi_info['aqi'],
            "category": overall_aqi_info['category'],
            "primary_pollutant": "PM2.5",
            "color": overall_aqi_info['color'],
            "coordinates": {"lat": coordinates["lat"], "lon": coordinates["lon"]},
            "pollutants": overall_pollutants,
            "last_updated": datetime.now(timezone.utc).isoformat()
        },
        "stations": stations,
        "source": "openaq"
    }

@api_router.get("/aqi/realtime-stations")
async def get_realtime_aqi_stations(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius: int = Query(100000, description="Search radius in meters")
):
    """Get real-time AQI data from nearby monitoring stations"""
    
    aqi_data = await fetch_openaq_data(lat, lon, radius)
    
    if not aqi_data or not aqi_data.get('results'):
        # Return mock data as fallback
        mock_data = load_json_file('aqi_data.json')
        return mock_data.get('stations', []) if mock_data else []
    
    stations = []
    for location in aqi_data.get('results', [])[:20]:
        station_name = location.get('name', 'Unknown Station')
        station_coords = location.get('coordinates', {})
        
        # Get measurements
        if 'measurements' in location or 'parameters' in location:
            measurements = location.get('measurements', []) or location.get('parameters', [])
            
            station_pollutants = {}
            for measurement in measurements:
                parameter = measurement.get('parameter', '')
                value = measurement.get('value') or measurement.get('lastValue', 0)
                
                if parameter in ['pm25', 'pm2.5', 'pm10', 'no2', 'so2', 'co', 'o3']:
                    param_key = parameter.replace('.', '')
                    station_pollutants[param_key] = value
            
            # Calculate station AQI
            if 'pm25' in station_pollutants or 'pm2.5' in station_pollutants:
                pm25_value = station_pollutants.get('pm25', station_pollutants.get('pm2.5', 0))
                aqi_info = calculate_aqi_from_pollutants({"pm25": pm25_value})
                
                stations.append({
                    "name": station_name,
                    "aqi": aqi_info['aqi'],
                    "category": aqi_info['category'],
                    "color": aqi_info['color'],
                    "lat": station_coords.get('latitude'),
                    "lon": station_coords.get('longitude'),
                    "pollutants": station_pollutants,
                    "distance": location.get('distance', 0)
                })
    
    return stations

# ==================== DISASTERS ENDPOINTS ====================

@api_router.get("/disasters")
async def get_disasters(disaster_type: Optional[str] = None, limit: int = Query(default=50, le=100)):
    """Get historical disaster data, optionally filter by type"""
    data = load_json_file('disasters.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load disasters data")
    
    if disaster_type:
        data = [d for d in data if d.get('type', '').lower() == disaster_type.lower()]
    
    return data[:limit]

@api_router.get("/disasters/{disaster_id}")
async def get_disaster_by_id(disaster_id: str):
    """Get specific disaster by ID"""
    data = load_json_file('disasters.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load disasters data")
    
    disaster = next((d for d in data if d.get('id') == disaster_id), None)
    if not disaster:
        raise HTTPException(status_code=404, detail="Disaster not found")
    
    return disaster

@api_router.get("/disasters/stats/summary")
async def get_disaster_statistics():
    """Get statistical summary of disasters"""
    data = load_json_file('disasters.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load disasters data")
    
    total_disasters = len(data)
    total_casualties = sum(d.get('casualties', 0) for d in data)
    total_affected = sum(d.get('affected_population', 0) for d in data)
    
    by_type = {}
    for disaster in data:
        d_type = disaster.get('type', 'Unknown')
        if d_type not in by_type:
            by_type[d_type] = {'count': 0, 'casualties': 0, 'affected': 0}
        by_type[d_type]['count'] += 1
        by_type[d_type]['casualties'] += disaster.get('casualties', 0)
        by_type[d_type]['affected'] += disaster.get('affected_population', 0)
    
    return {
        "total_disasters": total_disasters,
        "total_casualties": total_casualties,
        "total_affected_population": total_affected,
        "by_type": by_type
    }

# ==================== CYCLONE ENDPOINTS ====================

@api_router.get("/cyclone")
async def get_cyclone_data():
    """Get active cyclone tracking data"""
    data = load_json_file('cyclone_data.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load cyclone data")
    return data

@api_router.get("/cyclone/active")
async def get_active_cyclone():
    """Get current active cyclone information"""
    data = load_json_file('cyclone_data.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load cyclone data")
    return data.get('active_cyclone', {})

@api_router.get("/cyclone/track")
async def get_cyclone_track():
    """Get forecast track of active cyclone"""
    data = load_json_file('cyclone_data.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load cyclone data")
    return data.get('active_cyclone', {}).get('forecast_track', [])

@api_router.get("/cyclone/historical")
async def get_historical_cyclones():
    """Get historical cyclone data"""
    data = load_json_file('cyclone_data.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load cyclone data")
    return data.get('historical_cyclones', [])

# ==================== FLOOD ENDPOINTS ====================

@api_router.get("/flood-zones")
async def get_flood_zones(risk_level: Optional[str] = None):
    """Get flood zone data, optionally filter by risk level"""
    data = load_json_file('flood_zones.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load flood zones data")
    
    if risk_level:
        data = [zone for zone in data if zone.get('risk_level', '').lower() == risk_level.lower()]
    
    return data

# ==================== EARTHQUAKE ENDPOINTS ====================

@api_router.get("/earthquakes")
async def get_earthquakes(min_magnitude: Optional[float] = None, limit: int = Query(default=50, le=100)):
    """Get earthquake data, optionally filter by minimum magnitude"""
    data = load_json_file('earthquake_data.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load earthquake data")
    
    if min_magnitude:
        data = [eq for eq in data if eq.get('magnitude', 0) >= min_magnitude]
    
    # Sort by time (most recent first)
    data.sort(key=lambda x: x.get('time', ''), reverse=True)
    
    return data[:limit]

# ==================== AGRICULTURE ENDPOINTS ====================

@api_router.get("/agriculture")
async def get_agriculture_data():
    """Get comprehensive agriculture advisory data"""
    data = load_json_file('agriculture_data.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load agriculture data")
    return data

@api_router.get("/agriculture/advisory")
async def get_crop_advisory():
    """Get crop-wise advisory"""
    data = load_json_file('agriculture_data.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load agriculture data")
    return data.get('crop_advisory', [])

@api_router.get("/agriculture/prices")
async def get_market_prices():
    """Get current market prices"""
    data = load_json_file('agriculture_data.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load agriculture data")
    return data.get('market_prices', [])

# ==================== KNOWLEDGE CARDS ENDPOINTS ====================

@api_router.get("/knowledge-cards")
async def get_knowledge_cards(category: Optional[str] = None):
    """Get knowledge cards for disaster preparedness"""
    data = load_json_file('knowledge_cards.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load knowledge cards")
    
    if category:
        data = [card for card in data if card.get('category', '').lower() == category.lower()]
    
    return data

@api_router.get("/knowledge-cards/{card_id}")
async def get_knowledge_card_by_id(card_id: str):
    """Get specific knowledge card by ID"""
    data = load_json_file('knowledge_cards.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load knowledge cards")
    
    card = next((c for c in data if c.get('id') == card_id), None)
    if not card:
        raise HTTPException(status_code=404, detail="Knowledge card not found")
    
    return card

# ==================== EVACUATION CENTERS ENDPOINTS ====================

@api_router.get("/evacuation-centers")
async def get_evacuation_centers(shelter_type: Optional[str] = None, status: Optional[str] = None):
    """Get evacuation center information"""
    data = load_json_file('evacuation_centers.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load evacuation centers data")
    
    if shelter_type:
        data = [center for center in data if center.get('type', '').lower() == shelter_type.lower()]
    
    if status:
        data = [center for center in data if center.get('status', '').lower() == status.lower()]
    
    return data

@api_router.get("/evacuation-centers/{center_id}")
async def get_evacuation_center_by_id(center_id: str):
    """Get specific evacuation center by ID"""
    data = load_json_file('evacuation_centers.json')
    if data is None:
        raise HTTPException(status_code=500, detail="Unable to load evacuation centers data")
    
    center = next((c for c in data if c.get('id') == center_id), None)
    if not center:
        raise HTTPException(status_code=404, detail="Evacuation center not found")
    
    return center

# ==================== AI ASSISTANT ENDPOINTS ====================

async def get_disaster_context():
    """Get current disaster context for AI responses"""
    try:
        weather = load_json_file('weather_data.json')
        aqi = load_json_file('aqi_data.json')
        alerts = load_json_file('alerts.json')
        
        # Get active high-priority alerts
        active_alerts = [a for a in alerts if a.get('severity') in ['red', 'orange']][:3]
        
        context = {
            "current_weather": {
                "temperature": weather['current']['temperature'],
                "condition": weather['current']['condition'],
                "rain_probability": weather['current']['rain_probability']
            },
            "air_quality": {
                "aqi": aqi['current']['aqi'],
                "category": aqi['current']['category']
            },
            "active_alerts": active_alerts,
            "alert_count": len(alerts)
        }
        return context
    except Exception as e:
        logging.error(f"Error getting disaster context: {str(e)}")
        return {}

@api_router.post("/ai-assistant")
async def ai_assistant(request: AIQueryRequest):
    """AI-powered assistant using Gemini for disaster-related queries"""
    if not gemini_model:
        raise HTTPException(status_code=503, detail="AI service is not available")
    
    try:
        # Get real-time disaster context
        disaster_context = await get_disaster_context()
        
        # Build enhanced context-aware prompt
        context_info = f"""
Current Situation in India:
- Weather: {disaster_context.get('current_weather', {}).get('temperature', 'N/A')}°C, {disaster_context.get('current_weather', {}).get('condition', 'N/A')}
- Air Quality Index: {disaster_context.get('air_quality', {}).get('aqi', 'N/A')} ({disaster_context.get('air_quality', {}).get('category', 'N/A')})
- Active Alerts: {disaster_context.get('alert_count', 0)} alerts
"""
        
        if disaster_context.get('active_alerts'):
            context_info += "\nHigh Priority Alerts:\n"
            for alert in disaster_context['active_alerts']:
                context_info += f"- {alert.get('type', 'Alert')}: {alert.get('title', 'Unknown')} ({alert.get('severity', 'unknown')} level)\n"
        
        prompt = f"""You are Suraksha Setu AI Assistant, an expert in disaster management, environmental safety, and emergency response in India.

{context_info}

User Query: {request.query}

Instructions:
- Provide helpful, accurate, and actionable responses
- Use bullet points (- ) for lists to improve readability
- Use **bold** for important warnings or key points
- If it's an emergency query, prioritize immediate safety instructions
- Reference current conditions when relevant
- Keep responses concise but informative (2-4 paragraphs max)
- Be empathetic and supportive in tone

Response:"""

        response = gemini_model.generate_content(prompt)
        
        return {
            "query": request.query,
            "response": response.text,
            "context": disaster_context,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logging.error(f"AI Assistant error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing AI request")

@api_router.get("/ai-assistant/recommendations")
async def get_ai_recommendations():
    """Get AI-powered safety recommendations based on current conditions"""
    if not gemini_model:
        return {
            "recommendations": [
                {"type": "weather", "message": "Carry an umbrella, 80% chance of rain at 4 PM.", "priority": "medium"},
                {"type": "aqi", "message": "Avoid Sector 5 due to high AQI levels.", "priority": "high"},
                {"type": "safety", "message": "Check emergency kit batteries.", "priority": "low"}
            ]
        }
    
    try:
        # Get current data
        weather = load_json_file('weather_data.json')
        aqi = load_json_file('aqi_data.json')
        alerts = load_json_file('alerts.json')
        
        prompt = f"""Based on the following current conditions, provide 3-5 actionable safety recommendations for citizens:

Weather: Temperature {weather['current']['temperature']}°C, {weather['current']['condition']}, Rain probability {weather['current']['rain_probability']}%
AQI: {aqi['current']['aqi']} ({aqi['current']['category']})
Active Alerts: {len(alerts)} alerts including severity levels

Provide recommendations as a JSON array with format: {{"type": "category", "message": "recommendation text", "priority": "high/medium/low"}}"""

        response = gemini_model.generate_content(prompt)
        
        # Try to parse JSON from response
        import re
        json_match = re.search(r'\[.*\]', response.text, re.DOTALL)
        if json_match:
            recommendations = json.loads(json_match.group())
        else:
            # Fallback to mock data
            recommendations = [
                {"type": "weather", "message": "Carry an umbrella, high chance of rain expected.", "priority": "medium"},
                {"type": "cyclone", "message": "Cyclone approaching coast. Follow evacuation orders.", "priority": "high"},
                {"type": "aqi", "message": "Air quality moderate. Sensitive groups should limit outdoor activities.", "priority": "medium"}
            ]
        
        return {"recommendations": recommendations}
    except Exception as e:
        logging.error(f"AI Recommendations error: {str(e)}")
        # Return fallback recommendations
        return {
            "recommendations": [
                {"type": "weather", "message": "Monitor weather updates regularly.", "priority": "medium"},
                {"type": "safety", "message": "Keep emergency contacts handy.", "priority": "high"}
            ]
        }

# ==================== ADVANCED CHATBOT ENDPOINTS ====================

@api_router.post("/chatbot/message", response_model=ChatMessage)
async def chatbot_message(request: ChatbotMessageRequest):
    """Send message to chatbot with conversation history and context"""
    if not gemini_model:
        raise HTTPException(status_code=503, detail="AI service is not available")
    
    try:
        # Get conversation history for context from in-memory storage
        history = [msg for msg in in_memory_db["chat_messages"] 
                   if msg.get("session_id") == request.session_id][-10:]
        
        # Get real-time disaster context
        disaster_context = await get_disaster_context()
        
        # Build conversation history for context
        conversation_history = ""
        if history:
            conversation_history = "\n\nRecent Conversation:\n"
            for msg in history[-5:]:  # Last 5 messages
                conversation_history += f"User: {msg.get('message', '')}\n"
                conversation_history += f"Assistant: {msg.get('response', '')}\n"
        
        # Build context info
        context_info = f"""
Current Situation in India:
- Weather: {disaster_context.get('current_weather', {}).get('temperature', 'N/A')}°C, {disaster_context.get('current_weather', {}).get('condition', 'N/A')}
- Air Quality Index: {disaster_context.get('air_quality', {}).get('aqi', 'N/A')} ({disaster_context.get('air_quality', {}).get('category', 'N/A')})
- Active Alerts: {disaster_context.get('alert_count', 0)} alerts
"""
        
        if disaster_context.get('active_alerts'):
            context_info += "\nHigh Priority Alerts:\n"
            for alert in disaster_context['active_alerts']:
                context_info += f"- {alert.get('type', 'Alert')}: {alert.get('title', 'Unknown')} ({alert.get('severity', 'unknown')} level)\n"
        
        # Enhanced prompt with conversation history
        prompt = f"""You are Suraksha Setu AI Assistant, a specialized expert ONLY in disaster management, climate safety, environmental hazards, and emergency response in India.

{context_info}
{conversation_history}

Current User Query: {request.message}

CRITICAL INSTRUCTIONS:
- **ONLY answer questions related to:** disasters, climate, weather, earthquakes, floods, cyclones, fires, environmental safety, air quality, emergency preparedness, evacuation, safety guidelines, climate change, natural hazards, and emergency response
- **If the query is NOT related to disasters/climate/safety/environment:** Politely respond with: "I'm Suraksha Setu, specialized in disaster management and climate safety. I can only help with questions about natural disasters, weather emergencies, climate issues, environmental hazards, and safety measures. Please ask me something related to these topics."
- **DO NOT answer:** general knowledge, entertainment, sports, politics, technology (unless related to disaster management), personal advice, or any non-disaster/climate topics
- Provide helpful, accurate, and actionable responses for disaster-related queries
- Use bullet points (- ) for lists to improve readability
- Use **bold** for important warnings or key points
- If it's an emergency query, prioritize immediate safety instructions
- Reference conversation history when relevant
- Reference current conditions when relevant
- Keep responses concise but informative (2-4 paragraphs max)
- Be empathetic and supportive in tone

Response:"""

        response = gemini_model.generate_content(prompt)
        response_text = response.text if hasattr(response, 'text') else str(response)
        
        # Create chat message
        chat_message = ChatMessage(
            session_id=request.session_id,
            user_id=request.user_id,
            message=request.message,
            response=response_text,
            context=disaster_context
        )
        
        # Save to in-memory storage
        message_doc = chat_message.model_dump()
        message_doc['timestamp'] = message_doc['timestamp'].isoformat()
        in_memory_db["chat_messages"].append(message_doc)
        
        return chat_message
        
    except Exception as e:
        logging.error(f"Chatbot message error: {str(e)}")
        import traceback
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error processing chatbot message: {str(e)}")

@api_router.get("/chatbot/history")
async def get_chat_history(session_id: str, limit: int = Query(default=50, le=100)):
    """Get chat history for a session"""
    try:
        messages = await db.chat_messages.find(
            {"session_id": session_id},
            {"_id": 0}
        ).sort("timestamp", 1).limit(limit).to_list(limit)
        
        # Convert timestamp strings back to datetime for response
        for msg in messages:
            if isinstance(msg.get('timestamp'), str):
                msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
        
        return {"session_id": session_id, "messages": messages}
        
    except Exception as e:
        logging.error(f"Error fetching chat history: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching chat history")

@api_router.get("/chatbot/suggestions")
async def get_chatbot_suggestions():
    """Get suggested questions based on current situation"""
    try:
        disaster_context = await get_disaster_context()
        
        # Base suggestions
        suggestions = [
            "What should I do during an earthquake?",
            "How to prepare for a cyclone?",
            "Tell me about air quality safety tips",
            "What's in an emergency kit checklist?",
            "How to stay safe during floods?",
        ]
        
        # Add context-aware suggestions
        if disaster_context.get('air_quality', {}).get('aqi', 0) > 150:
            suggestions.insert(0, "What precautions should I take for poor air quality?")
        
        if disaster_context.get('active_alerts'):
            alert = disaster_context['active_alerts'][0]
            suggestions.insert(0, f"Tell me about the current {alert.get('type', 'alert')}")
        
        if disaster_context.get('current_weather', {}).get('rain_probability', 0) > 70:
            suggestions.insert(0, "What should I do if heavy rain is expected?")
        
        return {"suggestions": suggestions[:6]}  # Return top 6
        
    except Exception as e:
        logging.error(f"Error getting suggestions: {str(e)}")
        # Return default suggestions on error
        return {
            "suggestions": [
                "What should I do during an earthquake?",
                "How to prepare for a cyclone?",
                "Tell me about air quality safety tips",
                "What's in an emergency kit checklist?",
            ]
        }

@api_router.delete("/chatbot/clear")
async def clear_chat_history(session_id: str):
    """Clear chat history for a session"""
    try:
        result = await db.chat_messages.delete_many({"session_id": session_id})
        
        return {
            "success": True,
            "deleted_count": result.deleted_count,
            "message": "Chat history cleared successfully"
        }
        
    except Exception as e:
        logging.error(f"Error clearing chat history: {str(e)}")
        raise HTTPException(status_code=500, detail="Error clearing chat history")

# ==================== COMMUNITY REPORTS ENDPOINTS ====================

@api_router.post("/community-reports", response_model=CommunityReport)
async def create_community_report(report: CommunityReportCreate):
    """Submit a community disaster report"""
    report_obj = CommunityReport(**report.model_dump())
    
    doc = report_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.community_reports.insert_one(doc)
    
    return report_obj

@api_router.get("/community-reports")
async def get_community_reports(
    status: Optional[str] = None,
    report_type: Optional[str] = None,
    limit: int = Query(default=50, le=100)
):
    """Get community reports with optional filters"""
    query = {}
    if status:
        query['status'] = status
    if report_type:
        query['report_type'] = report_type
    
    reports = await db.community_reports.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    
    for report in reports:
        if isinstance(report.get('timestamp'), str):
            report['timestamp'] = datetime.fromisoformat(report['timestamp'])
    
    return reports

@api_router.get("/community-reports/{report_id}")
async def get_community_report_by_id(report_id: str):
    """Get specific community report by ID"""
    report = await db.community_reports.find_one({"id": report_id}, {"_id": 0})
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if isinstance(report.get('timestamp'), str):
        report['timestamp'] = datetime.fromisoformat(report['timestamp'])
    
    return report

# ==================== DASHBOARD SUMMARY ENDPOINT ====================

@api_router.get("/dashboard/summary")
async def get_dashboard_summary():
    """Get comprehensive dashboard summary with all key metrics"""
    try:
        weather = load_json_file('weather_data.json')
        aqi = load_json_file('aqi_data.json')
        alerts = load_json_file('alerts.json')
        disasters = load_json_file('disasters.json')
        cyclone = load_json_file('cyclone_data.json')
        
        # Calculate Suraksha Score (simplified algorithm)
        score = 100
        
        # Reduce score based on active alerts
        red_alerts = len([a for a in alerts if a.get('severity') == 'red'])
        orange_alerts = len([a for a in alerts if a.get('severity') == 'orange'])
        yellow_alerts = len([a for a in alerts if a.get('severity') == 'yellow'])
        
        score -= (red_alerts * 15 + orange_alerts * 10 + yellow_alerts * 5)
        
        # Reduce score based on AQI
        aqi_value = aqi['current']['aqi']
        if aqi_value > 300:
            score -= 20
        elif aqi_value > 200:
            score -= 15
        elif aqi_value > 100:
            score -= 10
        
        # Reduce score if cyclone is active
        if cyclone.get('active_cyclone'):
            score -= 25
        
        score = max(0, min(100, score))  # Clamp between 0-100
        
        return {
            "suraksha_score": score,
            "weather": weather['current'],
            "aqi": aqi['current'],
            "active_alerts_count": len(alerts),
            "alerts_by_severity": {
                "red": red_alerts,
                "orange": orange_alerts,
                "yellow": yellow_alerts
            },
            "total_historical_disasters": len(disasters),
            "active_cyclone": cyclone.get('active_cyclone') is not None,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logging.error(f"Dashboard summary error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating dashboard summary")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()
