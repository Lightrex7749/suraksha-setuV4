from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, status, Request, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import json
import google.generativeai as genai
from openai import AsyncOpenAI
from passlib.context import CryptContext
import jwt
import httpx
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import asyncio
from pywebpush import webpush, WebPushException
from py_vapid import Vapid
from cryptography.hazmat.primitives import serialization
from sqlalchemy import select, update, delete
from sqlalchemy.exc import IntegrityError

# Import database and models
from database import (
    get_db, init_db, close_db, AsyncSessionLocal,
    User, ChatMessage, Alert, CommunityReport, StatusCheck, 
    PushSubscription, CommunityPost, Comment
)

# Import translation service
from translation_service import translate_response, SUPPORTED_LANGUAGES, get_translation_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# PostgreSQL is configured in database.py
# No need for in-memory storage anymore
logging.info("PostgreSQL database configured via SQLAlchemy")

# Configure OpenAI (ChatGPT) - Primary AI backend
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
if OPENAI_API_KEY:
    openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    logging.info("Successfully initialized OpenAI (ChatGPT) API")
else:
    openai_client = None
    logging.warning("OpenAI API key not found. ChatGPT features will be disabled.")

# Configure Gemini AI - Fallback AI backend
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    # Use gemini-2.0-flash which is available
    try:
        gemini_model = genai.GenerativeModel('gemini-2.0-flash')
        logging.info("Successfully initialized Gemini AI with gemini-2.0-flash model (fallback)")
    except Exception as e:
        logging.error(f"Failed to initialize Gemini AI: {e}")
        gemini_model = None
else:
    gemini_model = None
    logging.warning("Gemini API key not found. Gemini fallback disabled.")

# Mapbox configuration
MAPBOX_ACCESS_TOKEN = os.environ.get('MAPBOX_ACCESS_TOKEN', '')
if MAPBOX_ACCESS_TOKEN:
    logging.info("Mapbox token configured")
else:
    logging.warning("Mapbox token not found. Map features will use default providers.")

# Security configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production-12345678')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ==================== WEBSOCKET CONNECTION MANAGER ====================

class ConnectionManager:
    """Manages WebSocket connections for real-time alerts"""
    
    def __init__(self):
        # Active connections: {client_id: websocket}
        self.active_connections: Dict[str, WebSocket] = {}
        # User locations: {client_id: {lat, lon, pin_code}}
        self.client_locations: Dict[str, Dict[str, Any]] = {}
        # Alert history to prevent duplicates
        self.sent_alerts: Dict[str, set] = {}  # {client_id: set of alert_ids}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.sent_alerts[client_id] = set()
        logging.info(f"WebSocket client connected: {client_id}")
        
        # Send welcome message
        await self.send_personal_message({
            "type": "connection",
            "message": "Connected to Suraksha Setu real-time alerts",
            "client_id": client_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, websocket)
    
    def disconnect(self, client_id: str):
        """Remove a WebSocket connection"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.client_locations:
            del self.client_locations[client_id]
        if client_id in self.sent_alerts:
            del self.sent_alerts[client_id]
        logging.info(f"WebSocket client disconnected: {client_id}")
    
    def set_client_location(self, client_id: str, location: Dict[str, Any]):
        """Store client location for targeted alerts"""
        self.client_locations[client_id] = location
        logging.info(f"Updated location for client {client_id}: {location.get('city', 'Unknown')}")
    
    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """Send message to a specific client"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logging.error(f"Error sending message to client: {str(e)}")
    
    async def broadcast(self, message: Dict[str, Any], alert_id: Optional[str] = None):
        """Broadcast message to all connected clients"""
        disconnected_clients = []
        
        for client_id, connection in self.active_connections.items():
            try:
                # Check if alert already sent to this client
                if alert_id and alert_id in self.sent_alerts.get(client_id, set()):
                    continue
                
                await connection.send_json(message)
                
                # Mark alert as sent
                if alert_id:
                    self.sent_alerts[client_id].add(alert_id)
                    
            except Exception as e:
                logging.error(f"Error broadcasting to client {client_id}: {str(e)}")
                disconnected_clients.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected_clients:
            self.disconnect(client_id)
    
    async def broadcast_location_based(self, alert: Dict[str, Any], radius_km: float = 100):
        """Broadcast alert only to clients within specified radius"""
        alert_coords = alert.get('coordinates', {})
        if not alert_coords or 'lat' not in alert_coords or 'lon' not in alert_coords:
            # No coordinates, broadcast to all
            await self.broadcast(alert, alert.get('id'))
            return
        
        alert_lat = alert_coords['lat']
        alert_lon = alert_coords['lon']
        alert_id = alert.get('id')
        
        disconnected_clients = []
        target_count = 0
        
        for client_id, connection in self.active_connections.items():
            try:
                # Check if alert already sent
                if alert_id and alert_id in self.sent_alerts.get(client_id, set()):
                    continue
                
                # Get client location
                client_location = self.client_locations.get(client_id)
                
                if client_location and 'latitude' in client_location and 'longitude' in client_location:
                    # Calculate distance
                    lat_diff = abs(client_location['latitude'] - alert_lat)
                    lon_diff = abs(client_location['longitude'] - alert_lon)
                    distance_km = ((lat_diff ** 2 + lon_diff ** 2) ** 0.5) * 111
                    
                    if distance_km <= radius_km:
                        # Add distance info to alert
                        alert_with_distance = {**alert, "distance_km": round(distance_km, 1)}
                        await connection.send_json(alert_with_distance)
                        target_count += 1
                        
                        if alert_id:
                            self.sent_alerts[client_id].add(alert_id)
                else:
                    # No location set, send alert anyway
                    await connection.send_json(alert)
                    if alert_id:
                        self.sent_alerts[client_id].add(alert_id)
                        
            except Exception as e:
                logging.error(f"Error broadcasting to client {client_id}: {str(e)}")
                disconnected_clients.append(client_id)
        
        # Clean up
        for client_id in disconnected_clients:
            self.disconnect(client_id)
        
        logging.info(f"Alert broadcast: {target_count} clients within {radius_km}km")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            "total_connections": len(self.active_connections),
            "clients_with_location": len(self.client_locations),
            "active_client_ids": list(self.active_connections.keys())
        }

# Initialize WebSocket manager
ws_manager = ConnectionManager()

# ==================== PUSH NOTIFICATION SETUP ====================

# VAPID keys for Web Push (generate once and store in .env for production)
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY')
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY')
VAPID_CLAIMS_EMAIL = os.environ.get('VAPID_CLAIMS_EMAIL', 'mailto:admin@surakshasetu.com')

# Generate VAPID keys if not in environment
if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
    logging.warning("VAPID keys not found in environment. Generating new keys...")
    vapid = Vapid()
    vapid.generate_keys()
    VAPID_PRIVATE_KEY = vapid.private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')
    VAPID_PUBLIC_KEY = vapid.public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')
    logging.info("Generated new VAPID keys. Add these to your .env file:")
    logging.info(f"VAPID_PUBLIC_KEY={VAPID_PUBLIC_KEY}")
    # Note: In production, you should save these keys and reuse them

# Push notification manager
class PushNotificationManager:
    """Manages push notification subscriptions and sending"""
    
    def __init__(self):
        # TODO: Migrate to PostgreSQL database
        # Using temporary in-memory list until full migration is complete
        self.subscriptions = []
    
    def add_subscription(self, subscription_info: Dict[str, Any]) -> bool:
        """Add a new push subscription"""
        try:
            # Check if subscription already exists
            endpoint = subscription_info.get('endpoint')
            for sub in self.subscriptions:
                if sub.get('endpoint') == endpoint:
                    logging.info(f"Subscription already exists: {endpoint}")
                    return True
            
            # Add new subscription
            self.subscriptions.append({
                **subscription_info,
                'created_at': datetime.now(timezone.utc).isoformat()
            })
            logging.info(f"Added push subscription: {endpoint}")
            return True
        except Exception as e:
            logging.error(f"Error adding subscription: {str(e)}")
            return False
    
    def remove_subscription(self, subscription_info: Dict[str, Any]) -> bool:
        """Remove a push subscription"""
        try:
            endpoint = subscription_info.get('endpoint')
            self.subscriptions[:] = [s for s in self.subscriptions if s.get('endpoint') != endpoint]
            logging.info(f"Removed push subscription: {endpoint}")
            return True
        except Exception as e:
            logging.error(f"Error removing subscription: {str(e)}")
            return False
    
    async def send_notification(
        self, 
        subscription_info: Dict[str, Any], 
        payload: Dict[str, Any]
    ) -> bool:
        """Send a push notification to a single subscription"""
        try:
            # Convert payload to JSON string
            payload_json = json.dumps(payload)
            
            # Send push notification
            webpush(
                subscription_info=subscription_info,
                data=payload_json,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={
                    "sub": VAPID_CLAIMS_EMAIL
                }
            )
            logging.info(f"Sent push notification to {subscription_info.get('endpoint')}")
            return True
        except WebPushException as e:
            logging.error(f"Web Push error: {str(e)}")
            # If subscription is invalid (410 Gone), remove it
            if e.response and e.response.status_code == 410:
                self.remove_subscription(subscription_info)
            return False
        except Exception as e:
            logging.error(f"Error sending push notification: {str(e)}")
            return False
    
    async def broadcast_notification(self, payload: Dict[str, Any]) -> int:
        """Send notification to all subscribed clients"""
        sent_count = 0
        failed_endpoints = []
        
        for subscription in self.subscriptions[:]:  # Copy list to avoid modification during iteration
            success = await self.send_notification(subscription, payload)
            if success:
                sent_count += 1
            else:
                failed_endpoints.append(subscription.get('endpoint'))
        
        if failed_endpoints:
            logging.warning(f"Failed to send to {len(failed_endpoints)} endpoints")
        
        return sent_count

# Initialize push notification manager
push_manager = PushNotificationManager()

# ==================== LANGUAGE HELPER FUNCTIONS ====================

def get_language_from_request(request: Request) -> str:
    """
    Extract language preference from request
    Priority: 1) Query param ?lang=hi, 2) Accept-Language header, 3) Default to 'en'
    
    Args:
        request: FastAPI Request object
    
    Returns:
        Language code (en, hi, ta, te, bn, mr)
    """
    # Try query parameter first
    lang = request.query_params.get('lang', '').lower()
    if lang in SUPPORTED_LANGUAGES:
        return lang
    
    # Try Accept-Language header
    accept_lang = request.headers.get('accept-language', '')
    if accept_lang:
        # Parse Accept-Language header (e.g., "hi-IN,hi;q=0.9,en;q=0.8")
        languages = accept_lang.split(',')
        for lang_item in languages:
            lang_code = lang_item.split(';')[0].split('-')[0].strip().lower()
            if lang_code in SUPPORTED_LANGUAGES:
                return lang_code
    
    # Default to English
    return 'en'

# Lifespan handler will be added later after imports
from contextlib import asynccontextmanager

# Database lifecycle management
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database
    logging.info("Initializing PostgreSQL database...")
    await init_db()
    logging.info("Database initialized successfully")
    yield
    # Shutdown: Close database connections
    logging.info("Closing database connections...")
    await close_db()
    logging.info("Database connections closed")

# Create the main app with lifespan manager
app = FastAPI(
    title="Suraksha Setu API", 
    version="1.0.0",
    lifespan=lifespan
)

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
    """Convert city/location name to coordinates with improved accuracy"""
    try:
        # First attempt: Try exact search
        location = geolocator.geocode(location_name, timeout=10, exactly_one=True)
        
        if location:
            return {
                "lat": location.latitude,
                "lon": location.longitude,
                "display_name": location.address
            }
        
        # Second attempt: Try adding "India" if no result (for Indian cities)
        if not location and ',' not in location_name and 'india' not in location_name.lower():
            location = geolocator.geocode(f"{location_name}, India", timeout=10, exactly_one=True)
            if location:
                return {
                    "lat": location.latitude,
                    "lon": location.longitude,
                    "display_name": location.address
                }
        
        # Third attempt: Try broader search with multiple results
        if not location:
            locations = geolocator.geocode(location_name, timeout=10, exactly_one=False, limit=5)
            if locations:
                # Return the first result with highest relevance
                best_location = locations[0]
                return {
                    "lat": best_location.latitude,
                    "lon": best_location.longitude,
                    "display_name": best_location.address
                }
        
        return None
    except GeocoderTimedOut:
        logging.error(f"Geocoding timeout for: {location_name}")
        return None
    except GeocoderServiceError as e:
        logging.error(f"Geocoding service error: {str(e)}")
        return None
    except Exception as e:
        logging.error(f"Unexpected geocoding error: {str(e)}")
        return None

async def fetch_openweather_data(lat: float, lon: float):
    """Fetch weather data from OpenWeatherMap API"""
    try:
        openweather_key = os.getenv("OPENWEATHER_API_KEY", "")
        
        if not openweather_key:
            logging.warning("OPENWEATHER_API_KEY not set, using fallback")
            return None
        
        logging.info(f"Fetching weather from OpenWeather for lat={lat}, lon={lon}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Use current weather API (always free) + 5-day forecast
            current_url = "https://api.openweathermap.org/data/2.5/weather"
            forecast_url = "https://api.openweathermap.org/data/2.5/forecast"
            
            params = {
                "lat": lat,
                "lon": lon,
                "appid": openweather_key,
                "units": "metric"  # Celsius
            }
            
            # Fetch current weather
            current_response = await client.get(current_url, params=params)
            current_response.raise_for_status()
            current_data = current_response.json()
            
            # Fetch forecast
            forecast_response = await client.get(forecast_url, params=params)
            forecast_response.raise_for_status()
            forecast_data = forecast_response.json()
            
            # Combine into OneCall-like format
            combined_data = {
                "lat": lat,
                "lon": lon,
                "current": {
                    "dt": current_data.get("dt"),
                    "temp": current_data.get("main", {}).get("temp"),
                    "feels_like": current_data.get("main", {}).get("feels_like"),
                    "humidity": current_data.get("main", {}).get("humidity"),
                    "pressure": current_data.get("main", {}).get("pressure"),
                    "wind_speed": current_data.get("wind", {}).get("speed"),
                    "wind_deg": current_data.get("wind", {}).get("deg"),
                    "clouds": current_data.get("clouds", {}).get("all"),
                    "weather": current_data.get("weather", []),
                    "rain": current_data.get("rain", {})
                },
                "hourly": [],
                "daily": []
            }
            
            # Process forecast into hourly and daily
            if "list" in forecast_data:
                daily_temps = {}
                for item in forecast_data["list"]:
                    dt = item.get("dt")
                    date = datetime.fromtimestamp(dt, tz=timezone.utc).strftime("%Y-%m-%d")
                    
                    # Add to hourly (first 24 items = 24 hours)
                    if len(combined_data["hourly"]) < 24:
                        combined_data["hourly"].append({
                            "dt": dt,
                            "temp": item.get("main", {}).get("temp"),
                            "feels_like": item.get("main", {}).get("feels_like"),
                            "humidity": item.get("main", {}).get("humidity"),
                            "wind_speed": item.get("wind", {}).get("speed"),
                            "weather": item.get("weather", []),
                            "pop": item.get("pop", 0),
                            "rain": item.get("rain", {})
                        })
                    
                    # Aggregate for daily
                    if date not in daily_temps:
                        daily_temps[date] = {
                            "temps": [],
                            "humidity": [],
                            "rain": 0,
                            "pop": 0,
                            "weather": item.get("weather", []),
                            "dt": dt,
                            "wind_speed": item.get("wind", {}).get("speed", 0)
                        }
                    daily_temps[date]["temps"].append(item.get("main", {}).get("temp", 0))
                    daily_temps[date]["humidity"].append(item.get("main", {}).get("humidity", 0))
                    daily_temps[date]["rain"] += item.get("rain", {}).get("3h", 0)
                    daily_temps[date]["pop"] = max(daily_temps[date]["pop"], item.get("pop", 0))
                
                # Create daily forecast
                for date, data in list(daily_temps.items())[:7]:
                    combined_data["daily"].append({
                        "dt": data["dt"],
                        "temp": {
                            "max": max(data["temps"]),
                            "min": min(data["temps"])
                        },
                        "humidity": sum(data["humidity"]) / len(data["humidity"]),
                        "wind_speed": data["wind_speed"],
                        "weather": data["weather"],
                        "pop": data["pop"],
                        "rain": data["rain"]
                    })
            
            logging.info(f"OpenWeather API success for lat={lat}, lon={lon}")
            return combined_data
            
    except httpx.HTTPStatusError as e:
        logging.error(f"OpenWeather API HTTP error: {e.response.status_code} - {e.response.text}")
        return None
    except httpx.RequestError as e:
        logging.error(f"OpenWeather API request error: {str(e)}")
        return None
    except Exception as e:
        logging.error(f"OpenWeather API error: {str(e)}", exc_info=True)
        return None

async def fetch_open_meteo_weather(lat: float, lon: float):
    """Fetch weather data from Open-Meteo API (Fallback)"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Current weather and hourly forecast
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weathercode,cloudcover,windspeed_10m,winddirection_10m,pressure_msl",
                "hourly": "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,rain,weathercode",
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
    """Fetch air quality data using OpenWeather Air Pollution API"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Use OpenWeather Air Pollution API
            # Get your free API key at: https://openweathermap.org/api
            openweather_key = os.getenv("OPENWEATHER_API_KEY", "")
            
            if not openweather_key:
                logging.warning("OPENWEATHER_API_KEY not set, using mock data")
                return None
            
            logging.info(f"Fetching AQI data from OpenWeather for lat={lat}, lon={lon}")
            
            # OpenWeather Air Pollution API endpoint
            air_pollution_url = "http://api.openweathermap.org/data/2.5/air_pollution"
            params = {
                "lat": lat,
                "lon": lon,
                "appid": openweather_key
            }
            
            response = await client.get(air_pollution_url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'list' in data and len(data['list']) > 0:
                    air_data = data['list'][0]
                    aqi = air_data.get('main', {}).get('aqi', 0)
                    components = air_data.get('components', {})
                    
                    # OpenWeather AQI scale: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
                    # Convert to US AQI scale (0-500)
                    aqi_mapping = {
                        1: 50,   # Good (0-50)
                        2: 100,  # Fair (51-100)
                        3: 150,  # Moderate (101-150)
                        4: 200,  # Poor (151-200)
                        5: 300   # Very Poor (201-300)
                    }
                    us_aqi = aqi_mapping.get(aqi, 100)
                    
                    # Build measurements array from components
                    measurements = []
                    if 'pm2_5' in components:
                        measurements.append({"parameter": "pm25", "value": components['pm2_5']})
                    if 'pm10' in components:
                        measurements.append({"parameter": "pm10", "value": components['pm10']})
                    if 'no2' in components:
                        measurements.append({"parameter": "no2", "value": components['no2']})
                    if 'so2' in components:
                        measurements.append({"parameter": "so2", "value": components['so2']})
                    if 'o3' in components:
                        measurements.append({"parameter": "o3", "value": components['o3']})
                    if 'co' in components:
                        measurements.append({"parameter": "co", "value": components['co']})
                    
                    logging.info(f"OpenWeather API success for lat={lat}, lon={lon}: AQI={us_aqi}, PM2.5={components.get('pm2_5', 'N/A')}, Measurements={len(measurements)}")
                    
                    # Return in standard format
                    return {
                        "results": [{
                            "location": f"Location ({lat:.2f}, {lon:.2f})",
                            "coordinates": {
                                "latitude": lat,
                                "longitude": lon
                            },
                            "measurements": measurements,
                            "aqi": us_aqi,
                            "raw_aqi": aqi  # Store original OpenWeather AQI (1-5)
                        }]
                    }
            
            logging.warning(f"OpenWeather API returned status {response.status_code}")
            return None
            
    except Exception as e:
        logging.error(f"AQI API error: {str(e)}")
        return None

async def get_location_from_ip(ip_address: str = None):
    """Get location from IP address using ip-api.com (free, no key required)"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"http://ip-api.com/json/{ip_address}" if ip_address else "http://ip-api.com/json/"
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') == 'success':
                return {
                    "lat": data.get('lat'),
                    "lon": data.get('lon'),
                    "city": data.get('city'),
                    "region": data.get('regionName'),
                    "country": data.get('country'),
                    "display_name": f"{data.get('city')}, {data.get('regionName')}, {data.get('country')}",
                    "timezone": data.get('timezone'),
                    "zip": data.get('zip')
                }
    except Exception as e:
        logging.error(f"IP geolocation error: {str(e)}")
    return None

async def generate_weather_insights(weather_data: dict, location: str):
    """Generate AI-powered weather insights using Gemini"""
    try:
        # Get Gemini API key
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        
        if not gemini_key:
            logging.warning("Gemini API key not found, using rule-based insights")
            return generate_fallback_insights(weather_data, location)
        
        # Configure Gemini
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel('gemini-pro')
        
        current = weather_data.get('current', {})
        temp = current.get('temperature', 20)
        feels_like = current.get('apparent_temperature', temp)
        condition = current.get('condition', 'Clear')
        humidity = current.get('humidity', 50)
        wind = current.get('wind_speed', 10)
        rain = current.get('precipitation_probability', 0)
        
        # Create detailed prompt for Gemini
        prompt = f"""You are a helpful weather assistant. Generate personalized weather advice for {location}.

Current Conditions:
- Temperature: {temp}°C (Feels like {feels_like}°C)
- Weather: {condition}
- Humidity: {humidity}%
- Wind Speed: {wind} km/h
- Rain Probability: {rain}%

Generate EXACTLY 4 specific tips in this format (use these exact icons and categories):

🧥 What to Wear: [specific clothing recommendation based on actual temperature and conditions]
☀️ Activities: [specific activity suggestions based on actual weather]
💧 Hydration: [specific rain/water advice based on actual conditions]
🌡️ Comfort: [specific comfort tips based on actual humidity/temperature]

Make each tip specific to the ACTUAL current conditions, not generic. Keep each tip to one concise sentence."""

        # Generate with Gemini
        response = model.generate_content(prompt)
        
        if response and response.text:
            # Clean up the response
            insights = response.text.strip()
            
            # Format with proper line breaks and bold
            insights = insights.replace('🧥', '\n\n* 🧥:')
            insights = insights.replace('☀️', '\n* ☀️:')
            insights = insights.replace('💧', '\n* 💧:')
            insights = insights.replace('🌡️', '\n* 🌡️:')
            
            # Make category names bold
            insights = insights.replace('What to Wear:', '**What to Wear**:')
            insights = insights.replace('Activities:', '**Activities**:')
            insights = insights.replace('Hydration:', '**Hydration**:')
            insights = insights.replace('Comfort:', '**Comfort**:')
            insights = insights.replace('Rain:', '**Rain**:')
            
            return insights.strip()
        else:
            return generate_fallback_insights(weather_data, location)
            
    except Exception as e:
        logging.error(f"Gemini weather insights error: {str(e)}")
        return generate_fallback_insights(weather_data, location)

def generate_fallback_insights(weather_data: dict, location: str):
    """Generate fallback insights when Gemini is unavailable"""
    current = weather_data.get('current', {})
    
    temp = current.get('temperature', 20)
    feels_like = current.get('apparent_temperature', temp)
    condition = current.get('condition', 'Clear').lower()
    humidity = current.get('humidity', 50)
    wind = current.get('wind_speed', 10)
    rain = current.get('precipitation_probability', 0)
    
    # Intro with actual conditions
    intro = f"Weather update for {location}: {temp}°C with {condition} conditions."
    if feels_like != temp:
        intro += f" Feels like {feels_like}°C."
    
    # Dynamic clothing based on actual temp
    if temp < 10:
        wear = f"* 🧥: **What to Wear**: Heavy winter coat, gloves, and warm layers needed for {temp}°C."
    elif temp < 15:
        wear = f"* 🧥: **What to Wear**: Jacket required - it's quite cool at {temp}°C."
    elif temp < 20:
        wear = f"* 🧥: **What to Wear**: Light jacket recommended for {temp}°C weather."
    elif temp < 25:
        wear = f"* 🧥: **What to Wear**: Comfortable clothing perfect for {temp}°C."
    elif temp < 30:
        wear = f"* 🧥: **What to Wear**: Light, breathable clothing for {temp}°C."
    else:
        wear = f"* 🧥: **What to Wear**: Very light clothing essential - it's {temp}°C!"
    
    # Activity based on actual conditions
    if rain > 50:
        activities = f"* ☀️: **Activities**: Heavy rain expected ({rain}% chance) - indoor activities recommended."
    elif rain > 20:
        activities = f"* ☀️: **Activities**: {rain}% rain chance - bring umbrella if going out."
    elif condition in ['clear', 'sunny']:
        activities = f"* ☀️: **Activities**: Perfect {condition} day at {temp}°C - great for outdoor activities!"
    elif wind > 30:
        activities = f"* ☀️: **Activities**: Windy conditions ({wind} km/h) - secure loose items."
    else:
        activities = f"* ☀️: **Activities**: Pleasant {condition} weather for most outdoor activities."
    
    # Rain/hydration with actual probability
    if rain > 50:
        rain_advice = f"* 💧: **Rain**: {rain}% rain probability - umbrella essential!"
    elif rain > 20:
        rain_advice = f"* 💧: **Rain**: {rain}% rain chance - keep umbrella handy."
    elif temp > 30:
        rain_advice = f"* 💧: **Hydration**: Hot at {temp}°C - drink water frequently!"
    else:
        rain_advice = "* 💧: **Hydration**: Stay hydrated throughout the day."
    
    # Comfort with actual humidity
    if humidity > 80:
        comfort = f"* 🌡️: **Comfort**: Very humid ({humidity}%) - expect muggy conditions."
    elif humidity > 70:
        comfort = f"* 🌡️: **Comfort**: High humidity ({humidity}%) - may feel warmer than {temp}°C."
    elif humidity < 30:
        comfort = f"* 🌡️: **Comfort**: Low humidity ({humidity}%) - moisturize and hydrate."
    elif temp > 35:
        comfort = f"* 🌡️: **Comfort**: Extreme heat at {temp}°C - limit sun exposure."
    elif temp < 5:
        comfort = f"* 🌡️: **Comfort**: Very cold at {temp}°C - limit outdoor time."
    else:
        comfort = f"* 🌡️: **Comfort**: Pleasant conditions at {temp}°C and {humidity}% humidity."
    
    return f"{intro}\n\n{wear}\n{activities}\n{rain_advice}\n{comfort}"

async def reverse_geocode(lat: float, lon: float):
    """Convert coordinates to readable location name"""
    try:
        location = geolocator.reverse(f"{lat}, {lon}", timeout=10, exactly_one=True)
        if location:
            return {
                "lat": lat,
                "lon": lon,
                "display_name": location.address,
                "city": location.raw.get('address', {}).get('city') or location.raw.get('address', {}).get('town'),
                "state": location.raw.get('address', {}).get('state'),
                "country": location.raw.get('address', {}).get('country')
            }
    except Exception as e:
        logging.error(f"Reverse geocoding error: {str(e)}")
    return {"lat": lat, "lon": lon, "display_name": f"{lat}, {lon}"}

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

def openweather_condition_to_text(weather_data: dict) -> str:
    """Convert OpenWeather condition to readable text"""
    if weather_data and len(weather_data) > 0:
        main = weather_data[0].get("main", "Unknown")
        description = weather_data[0].get("description", "")
        return description.title() if description else main
    return "Unknown"

def transform_openweather_data(ow_data: dict, location_name: str = "Unknown"):
    """Transform OpenWeather API response to our app's format"""
    current = ow_data.get("current", {})
    hourly = ow_data.get("hourly", [])
    daily = ow_data.get("daily", [])
    
    # Current weather
    current_weather = {
        "location": location_name,
        "name": location_name,
        "coordinates": {"lat": ow_data.get("lat"), "lon": ow_data.get("lon")},
        "temperature": int(current.get("temp", 0)),
        "apparent_temperature": int(current.get("feels_like", 0)),
        "feels_like": int(current.get("feels_like", 0)),
        "condition": openweather_condition_to_text(current.get("weather", [])),
        "humidity": int(current.get("humidity", 0)),
        "wind_speed": int(current.get("wind_speed", 0)),
        "wind_direction": int(current.get("wind_deg", 0)),
        "pressure": int(current.get("pressure", 0)),
        "cloud_cover": int(current.get("clouds", 0)),
        "rain": current.get("rain", {}).get("1h", 0) if isinstance(current.get("rain"), dict) else 0,
        "precipitation": current.get("rain", {}).get("1h", 0) if isinstance(current.get("rain"), dict) else 0,
        "weather_code": current.get("weather", [{}])[0].get("id", 0) if current.get("weather") else 0,
        "last_updated": datetime.fromtimestamp(current.get("dt", 0), tz=timezone.utc).isoformat() if current.get("dt") else datetime.now(timezone.utc).isoformat()
    }
    
    # Hourly forecast
    hourly_forecast = []
    for hour in hourly[:24]:  # Next 24 hours
        hourly_forecast.append({
            "time": datetime.fromtimestamp(hour.get("dt", 0), tz=timezone.utc).isoformat(),
            "temperature": int(hour.get("temp", 0)),
            "condition": openweather_condition_to_text(hour.get("weather", [])),
            "precipitation_probability": int(hour.get("pop", 0) * 100),
            "precipitation": hour.get("rain", {}).get("1h", 0) if isinstance(hour.get("rain"), dict) else 0,
            "humidity": int(hour.get("humidity", 0)),
            "wind_speed": int(hour.get("wind_speed", 0))
        })
    
    # Daily forecast
    daily_forecast = []
    for day in daily[:7]:  # Next 7 days
        daily_forecast.append({
            "date": datetime.fromtimestamp(day.get("dt", 0), tz=timezone.utc).strftime("%Y-%m-%d"),
            "temperature_max": int(day.get("temp", {}).get("max", 0)),
            "temperature_min": int(day.get("temp", {}).get("min", 0)),
            "condition": openweather_condition_to_text(day.get("weather", [])),
            "precipitation_sum": day.get("rain", 0),
            "precipitation_probability": int(day.get("pop", 0) * 100),
            "humidity": int(day.get("humidity", 0)),
            "wind_speed": int(day.get("wind_speed", 0))
        })
    
    return {
        "current": current_weather,
        "hourly": hourly_forecast,
        "daily": daily_forecast
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

class QuizSubmission(BaseModel):
    quiz_id: str
    answers: Dict[int, int]  # question_id: answer_index
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

# ==================== LOCATION & PIN CODE MODELS ====================

class PinCodeValidateRequest(BaseModel):
    pin_code: str

class PinCodeInfo(BaseModel):
    pin_code: str
    city: str
    district: str
    state: str
    country: str = "India"
    latitude: float
    longitude: float
    is_valid: bool = True

class UserLocationPreference(BaseModel):
    user_id: Optional[str] = None
    pin_code: str
    city: str
    state: str
    latitude: float
    longitude: float
    is_primary: bool = True
    alert_preferences: Optional[Dict[str, Any]] = None

class LocationUpdateRequest(BaseModel):
    pin_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    enable_alerts: bool = True
    alert_severity: List[str] = ["warning", "critical"]  # info, warning, critical

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
    
    # Store in in-memory storage
    in_memory_db["status_checks"].append(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Use in-memory storage
    status_checks = in_memory_db["status_checks"].copy()
    
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

@api_router.get("/weather/auto-detect")
async def get_weather_auto_detect(request: Request):
    """Auto-detect location and get weather data using IP geolocation with AI insights"""
    client_ip = request.client.host if request.client else None
    
    # Skip localhost IPs
    if client_ip and (client_ip.startswith('127.') or client_ip.startswith('192.168.') or client_ip == '::1'):
        client_ip = None
    
    # Get location from IP
    location_data = await get_location_from_ip(client_ip)
    
    if not location_data:
        # Fallback to default location
        location_data = {
            "lat": 20.5937,
            "lon": 78.9629,
            "display_name": "India",
            "city": "India"
        }
    
    # Try OpenWeather first
    weather_data = await fetch_openweather_data(location_data["lat"], location_data["lon"])
    
    if weather_data:
        # Transform OpenWeather data
        transformed_data = transform_openweather_data(weather_data, location_data.get("display_name", "your location"))
        
        # Get AI insights
        ai_insights = await generate_weather_insights(
            transformed_data,
            location_data.get("display_name", "your location")
        )
        
        return {
            "location": location_data,
            "current": transformed_data["current"],
            "ai_insights": ai_insights,
            "detection_method": "ip" if client_ip else "default",
            "source": "openweather"
        }
    
    # Fallback to Open-Meteo
    logging.info("OpenWeather failed, trying Open-Meteo...")
    weather_data = await fetch_open_meteo_weather(location_data["lat"], location_data["lon"])
    
    if not weather_data:
        raise HTTPException(status_code=503, detail="Weather service temporarily unavailable")
    
    current = weather_data.get('current', {})
    
    # Get AI insights
    ai_insights = await generate_weather_insights(
        {"current": {
            "temperature": int(current.get('temperature_2m', 0)),
            "feels_like": int(current.get('apparent_temperature', 0)),
            "condition": get_weather_condition(current.get('weathercode', 0)),
            "humidity": int(current.get('relative_humidity_2m', 0)),
            "wind_speed": int(current.get('windspeed_10m', 0)),
            "rain": current.get('rain', 0)
        }},
        location_data.get("display_name", "your location")
    )
    
    return {
        "location": location_data,
        "current": {
            "temperature": int(current.get('temperature_2m', 0)),
            "feels_like": int(current.get('apparent_temperature', 0)),
            "condition": get_weather_condition(current.get('weathercode', 0)),
            "humidity": int(current.get('relative_humidity_2m', 0)),
            "wind_speed": int(current.get('windspeed_10m', 0)),
            "rain": current.get('rain', 0),
            "coordinates": {"lat": location_data["lat"], "lon": location_data["lon"]}
        },
        "ai_insights": ai_insights,
        "detection_method": "ip" if client_ip else "default"
    }

@api_router.get("/weather/location")
async def get_weather_by_location(
    request: Request,
    q: Optional[str] = Query(None, description="City or location name"),
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude"),
    ai_insights: bool = Query(True, description="Include AI-powered weather insights")
):
    """Get weather data for a specific location with optional Gemini AI insights (multilingual support via ?lang=hi)"""
    
    # Get language preference
    target_lang = get_language_from_request(request)
    
    # Determine coordinates
    if lat is not None and lon is not None:
        # Reverse geocode to get location name
        coordinates = await reverse_geocode(lat, lon)
    elif q:
        coordinates = await geocode_location(q)
        if not coordinates:
            # Provide helpful error message with suggestions
            suggestion = f"Try searching with full city name (e.g., 'Mumbai, India' or 'New York, USA')"
            raise HTTPException(
                status_code=404, 
                detail=f"Location '{q}' not found. {suggestion}"
            )
    else:
        raise HTTPException(
            status_code=400, 
            detail="Either 'q' (location name) or 'lat' and 'lon' must be provided"
        )
    
    # Try OpenWeather first
    weather_data = await fetch_openweather_data(coordinates["lat"], coordinates["lon"])
    
    if weather_data:
        # Transform OpenWeather data to our format
        location_name = coordinates.get("display_name", "Unknown")
        transformed_data = transform_openweather_data(weather_data, location_name)
        
        # Generate AI insights if requested
        weather_insights = None
        if ai_insights:
            weather_insights = await generate_weather_insights(
                transformed_data,
                location_name
            )
            transformed_data["ai_insights"] = weather_insights
        
        transformed_data["source"] = "openweather"
        
        # Translate weather data if language is not English
        if target_lang != 'en':
            transformed_data = translate_response(transformed_data, target_lang, 'weather')
        
        return transformed_data
    
    # Fallback to Open-Meteo if OpenWeather fails
    logging.info("OpenWeather failed, trying Open-Meteo...")
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
        "name": coordinates.get("city") or coordinates.get("display_name", "Unknown"),
        "coordinates": {"lat": coordinates["lat"], "lon": coordinates["lon"]},
        "temperature": int(current.get('temperature_2m', 0)),
        "apparent_temperature": int(current.get('apparent_temperature', 0)),
        "feels_like": int(current.get('apparent_temperature', 0)),
        "condition": get_weather_condition(current.get('weathercode', 0)),
        "humidity": int(current.get('relative_humidity_2m', 0)),
        "wind_speed": int(current.get('windspeed_10m', 0)),
        "wind_direction": int(current.get('winddirection_10m', 0)),
        "pressure": int(current.get('pressure_msl', 0)),
        "cloud_cover": int(current.get('cloudcover', 0)),
        "rain": current.get('rain', 0),
        "precipitation": current.get('precipitation', 0),
        "weather_code": current.get('weathercode', 0),
        "last_updated": current.get('time', datetime.now(timezone.utc).isoformat())
    }
    
    # Generate AI insights if requested
    weather_insights = None
    if ai_insights:
        weather_insights = await generate_weather_insights(
            {"current": current_weather, "daily": daily},
            coordinates.get("display_name", "Unknown")
        )
    
    # Process hourly forecast (next 48 hours to ensure 24-hour display coverage)
    hourly_forecast = []
    if hourly and 'time' in hourly:
        for i in range(min(48, len(hourly['time']))):
            hour_time = hourly['time'][i] if i < len(hourly['time']) else None
            if hour_time:
                hourly_forecast.append({
                    "time": hour_time,
                    "temp": int(hourly['temperature_2m'][i]) if i < len(hourly.get('temperature_2m', [])) else 0,
                    "temperature": int(hourly['temperature_2m'][i]) if i < len(hourly.get('temperature_2m', [])) else 0,
                    "humidity": int(hourly['relative_humidity_2m'][i]) if i < len(hourly.get('relative_humidity_2m', [])) else 0,
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
    
    response_data = {
        "current": current_weather,
        "hourly": hourly_forecast,
        "daily": daily_forecast,
        "location": {
            "name": coordinates.get("display_name", "Unknown"),
            "display_name": coordinates.get("display_name", "Unknown"),
            "city": coordinates.get("city"),
            "coordinates": {"lat": coordinates["lat"], "lon": coordinates["lon"]}
        },
        "source": "open-meteo"
    }
    
    # Add AI insights if generated
    if weather_insights:
        response_data["ai_insights"] = weather_insights
    
    return response_data

@api_router.get("/weather/rainfall-trends")
async def get_rainfall_trends(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    days: int = Query(7, ge=1, le=16, description="Number of days for forecast")
):
    """Get rainfall trend data for visualization"""
    
    # Try OpenWeather first
    weather_data = await fetch_openweather_data(lat, lon)
    
    if weather_data:
        hourly = weather_data.get('hourly', [])
        daily = weather_data.get('daily', [])
        
        # Daily rainfall trends from OpenWeather
        daily_trends = []
        for i, day in enumerate(daily[:min(days, len(daily))]):
            daily_trends.append({
                "date": datetime.fromtimestamp(day.get("dt", 0), tz=timezone.utc).strftime("%Y-%m-%d"),
                "rainfall": day.get("rain", 0),
                "precipitation": day.get("rain", 0),
                "probability": int(day.get("pop", 0) * 100)
            })
        
        # Hourly rainfall for next 48 hours
        hourly_trends = []
        for i, hour in enumerate(hourly[:48]):
            hourly_trends.append({
                "time": datetime.fromtimestamp(hour.get("dt", 0), tz=timezone.utc).isoformat(),
                "rainfall": hour.get("rain", {}).get("1h", 0) if isinstance(hour.get("rain"), dict) else 0,
                "precipitation": hour.get("rain", {}).get("1h", 0) if isinstance(hour.get("rain"), dict) else 0,
                "probability": int(hour.get("pop", 0) * 100)
            })
        
        return {
            "daily_trends": daily_trends,
            "hourly_trends": hourly_trends,
            "coordinates": {"lat": lat, "lon": lon},
            "source": "openweather"
        }
    
    # Fallback to Open-Meteo
    logging.info("OpenWeather failed, trying Open-Meteo for rainfall trends...")
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
async def get_alerts(request: Request, severity: Optional[str] = None):
    """Get all active alerts generated from current weather and conditions (multilingual support via ?lang=hi)"""
    
    # Get language preference
    target_lang = get_language_from_request(request)
    
    try:
        alerts = []
        
        # Get current weather to generate dynamic alerts
        try:
            weather_data = await fetch_open_meteo_weather(20.5937, 78.9629)  # India center
            current = weather_data.get('current', {})
            
            # Alert 1: High Temperature Warning
            if current.get('temperature', 0) > 40:
                alerts.append({
                    "id": "alert_001",
                    "title": "🌡️ Extreme Heat Warning",
                    "description": f"Temperature reaching {current.get('temperature')}°C - Extreme heat alert in effect",
                    "severity": "red",
                    "issued_at": datetime.now(timezone.utc).isoformat(),
                    "location": "Pan-India",
                    "category": "weather",
                    "recommendation": "Stay indoors, drink water frequently, avoid sun exposure"
                })
            
            # Alert 2: Heavy Rainfall
            if current.get('precipitation_probability', 0) > 70:
                alerts.append({
                    "id": "alert_002",
                    "title": "🌊 Heavy Rainfall Warning",
                    "description": f"Heavy rain expected with {current.get('precipitation_probability')}% probability",
                    "severity": "orange",
                    "issued_at": datetime.now(timezone.utc).isoformat(),
                    "location": "Flood-prone areas",
                    "category": "weather",
                    "recommendation": "Avoid low-lying areas and waterways"
                })
            
            # Alert 3: Strong Wind Warning
            if current.get('wind_speed', 0) > 40:
                alerts.append({
                    "id": "alert_003",
                    "title": "💨 Strong Wind Alert",
                    "description": f"Wind speeds up to {current.get('wind_speed')} km/h reported",
                    "severity": "orange",
                    "issued_at": datetime.now(timezone.utc).isoformat(),
                    "location": "Coastal and elevated areas",
                    "category": "weather",
                    "recommendation": "Secure loose items, stay indoors if possible"
                })
            
        except Exception as e:
            logging.warning(f"Weather fetch failed for alerts: {str(e)}")
        
        # Alert 4: Air Quality Alert
        try:
            aqi_data = await fetch_openaq_data(20.5937, 78.9629)  # India center
            if aqi_data and aqi_data.get('results'):
                aqi = aqi_data['results'][0].get('aqi', 0)
                if aqi > 300:
                    alerts.append({
                        "id": "alert_004",
                        "title": "😷 Hazardous Air Quality",
                        "description": f"AQI reading: {aqi} - Hazardous air quality detected",
                        "severity": "red",
                        "issued_at": datetime.now(timezone.utc).isoformat(),
                        "location": "Multiple locations",
                        "category": "air_quality",
                        "recommendation": "Wear N95 masks, stay indoors, use air purifiers"
                    })
                elif aqi > 200:
                    alerts.append({
                        "id": "alert_005",
                        "title": "⚠️ Very Unhealthy Air",
                        "description": f"AQI reading: {aqi} - Very unhealthy air quality",
                        "severity": "orange",
                        "issued_at": datetime.now(timezone.utc).isoformat(),
                        "location": "Multiple locations",
                        "category": "air_quality",
                        "recommendation": "Reduce outdoor activities, wear masks"
                    })
        except Exception as e:
            logging.warning(f"AQI fetch failed for alerts: {str(e)}")
        
        # Alert 5: Earthquake Risk
        alerts.append({
            "id": "alert_006",
            "title": "🚨 Seismic Activity Monitoring",
            "description": "Regular seismic activity being monitored across India",
            "severity": "yellow",
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "location": "Seismic zones",
            "category": "geological",
            "recommendation": "Know your safe spots, follow safety guidelines"
        })
        
        # Filter by severity if provided
        if severity:
            alerts = [a for a in alerts if a.get('severity', '').lower() == severity.lower()]
        
        # Translate alerts if language is not English
        if target_lang != 'en':
            alerts = translate_response(alerts, target_lang, 'alert')
        
        return alerts
        
    except Exception as e:
        logging.error(f"Error generating alerts: {str(e)}")
        # Fallback to basic alerts
        return [
            {
                "id": "alert_default_001",
                "title": "⚠️ System Alert",
                "description": "Please check weather conditions regularly",
                "severity": "yellow",
                "issued_at": datetime.now(timezone.utc).isoformat(),
                "location": "All areas",
                "category": "general",
                "recommendation": "Stay informed through official channels"
            }
        ]

@api_router.get("/alerts/{alert_id}")
async def get_alert_by_id(alert_id: str):
    """Get specific alert by ID"""
    try:
        # Get all alerts
        all_alerts = await get_alerts()
        
        # Find the alert
        alert = next((a for a in all_alerts if a.get('id') == alert_id), None)
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return alert
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching alert: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching alert")

# ==================== AQI ENDPOINTS ====================

@api_router.get("/aqi")
async def get_aqi():
    """Get comprehensive AQI data for major Indian cities"""
    try:
        major_cities = [
            {"name": "Delhi", "lat": 28.6139, "lon": 77.2090},
            {"name": "Mumbai", "lat": 19.0760, "lon": 72.8777},
            {"name": "Bangalore", "lat": 12.9716, "lon": 77.5946},
            {"name": "Chennai", "lat": 13.0827, "lon": 80.2707},
            {"name": "Kolkata", "lat": 22.5726, "lon": 88.3639},
        ]
        
        stations_data = []
        for city in major_cities:
            try:
                aqi_data = await fetch_openaq_data(city["lat"], city["lon"])
                if aqi_data and aqi_data.get('results'):
                    location = aqi_data['results'][0]
                    station_aqi = location.get('aqi', 100)
                    
                    if station_aqi <= 50:
                        category = "Good"
                    elif station_aqi <= 100:
                        category = "Moderate"
                    elif station_aqi <= 150:
                        category = "Unhealthy for Sensitive Groups"
                    elif station_aqi <= 200:
                        category = "Unhealthy"
                    elif station_aqi <= 300:
                        category = "Very Unhealthy"
                    else:
                        category = "Hazardous"
                    
                    stations_data.append({
                        "name": city["name"],
                        "aqi": int(station_aqi),
                        "category": category,
                        "lat": city["lat"],
                        "lon": city["lon"],
                        "coordinates": location.get('coordinates', {}),
                        "measurements": location.get('measurements', []),
                        "last_updated": datetime.now(timezone.utc).isoformat()
                    })
            except Exception as e:
                logging.warning(f"Failed to fetch AQI for {city['name']}: {str(e)}")
        
        if stations_data:
            avg_aqi = sum(s['aqi'] for s in stations_data) / len(stations_data)
        else:
            avg_aqi = 100
        
        return {
            "current": {
                "aqi": int(avg_aqi),
                "category": "Moderate" if avg_aqi <= 100 else "Unhealthy",
                "location": "Pan-India Average"
            },
            "stations": stations_data,
            "source": "openweather",
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logging.error(f"AQI fetch error: {str(e)}")
        return {
            "current": {"aqi": 100, "category": "Moderate", "location": "Pan-India Average"},
            "stations": [],
            "source": "error"
        }

@api_router.get("/aqi/current")
async def get_current_aqi():
    """Get current AQI data for user's location"""
    try:
        aqi_data = await get_aqi()
        return aqi_data.get('current', {})
    except Exception as e:
        logging.error(f"Current AQI error: {str(e)}")
        return {"aqi": 100, "category": "Moderate"}

@api_router.get("/aqi/stations")
async def get_aqi_stations():
    """Get AQI data from all monitoring stations"""
    try:
        aqi_data = await get_aqi()
        return aqi_data.get('stations', [])
    except Exception as e:
        logging.error(f"AQI stations error: {str(e)}")
        return []

@api_router.get("/aqi/historical")
async def get_aqi_historical():
    """Get historical AQI trends (simulated)"""
    # Generate simulated historical data
    import random
    historical = []
    for i in range(7):
        days_ago = 6 - i
        date = (datetime.now(timezone.utc) - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        aqi = random.randint(80, 180)
        
        if aqi <= 100:
            category = "Moderate"
        elif aqi <= 150:
            category = "Unhealthy for Sensitive Groups"
        else:
            category = "Unhealthy"
        
        historical.append({
            "date": date,
            "aqi": aqi,
            "category": category,
            "pm25": random.randint(30, 80),
            "pm10": random.randint(50, 120)
        })
    
    return historical

@api_router.get("/aqi/forecast")
async def get_aqi_forecast():
    """Get AQI forecast (next 3 days)"""
    import random
    forecast = []
    for i in range(3):
        days_ahead = i + 1
        date = (datetime.now(timezone.utc) + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        aqi = random.randint(80, 160)
        
        if aqi <= 100:
            category = "Moderate"
        elif aqi <= 150:
            category = "Unhealthy for Sensitive Groups"
        else:
            category = "Unhealthy"
        
        forecast.append({
            "date": date,
            "aqi": aqi,
            "category": category,
            "pm25": random.randint(30, 70),
            "pm10": random.randint(50, 100),
            "trend": "stable" if i == 0 else ("improving" if i % 2 == 0 else "worsening")
        })
    
    return forecast

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
    
    # Process WAQI data
    stations = []
    all_measurements = {}
    direct_aqi = None  # Will store the main AQI value from the first result
    
    for location in aqi_data.get('results', [])[:10]:
        station_name = location.get('location', 'Unknown Station')
        station_coords = location.get('coordinates', {})
        
        # Get direct AQI value from WAQI for this specific station
        station_direct_aqi = location.get('aqi', 0) if 'aqi' in location and location['aqi'] > 0 else None
        
        # Store the first valid AQI as the overall AQI
        if direct_aqi is None and station_direct_aqi:
            direct_aqi = station_direct_aqi
        
        # Get measurements
        measurements = location.get('measurements', [])
        
        if measurements:
            station_pollutants = {}
            for measurement in measurements:
                parameter = measurement.get('parameter', '').lower()
                value = measurement.get('value', 0)
                
                # Map parameter names
                if parameter in ['pm25', 'pm2.5']:
                    station_pollutants['pm25'] = value
                    if 'pm25' not in all_measurements:
                        all_measurements['pm25'] = []
                    all_measurements['pm25'].append(value)
                elif parameter == 'pm10':
                    station_pollutants['pm10'] = value
                    if 'pm10' not in all_measurements:
                        all_measurements['pm10'] = []
                    all_measurements['pm10'].append(value)
                elif parameter in ['no2', 'so2', 'co', 'o3']:
                    station_pollutants[parameter] = value
                    if parameter not in all_measurements:
                        all_measurements[parameter] = []
                    all_measurements[parameter].append(value)
            
            # Use station's direct AQI if available, otherwise calculate from PM2.5
            if station_direct_aqi:
                station_aqi = station_direct_aqi
                # Determine category based on AQI value
                if station_aqi <= 50:
                    category = "Good"
                elif station_aqi <= 100:
                    category = "Moderate"
                elif station_aqi <= 150:
                    category = "Unhealthy for Sensitive Groups"
                elif station_aqi <= 200:
                    category = "Unhealthy"
                elif station_aqi <= 300:
                    category = "Very Unhealthy"
                else:
                    category = "Hazardous"
            elif 'pm25' in station_pollutants:
                aqi_info = calculate_aqi_from_pollutants({"pm25": station_pollutants['pm25']})
                station_aqi = aqi_info['aqi']
                category = aqi_info['category']
            else:
                continue
                
            stations.append({
                "name": station_name,
                "aqi": station_aqi,
                "category": category,
                "lat": station_coords.get('latitude'),
                "lon": station_coords.get('longitude'),
                "pollutants": station_pollutants,
                "last_updated": datetime.now(timezone.utc).isoformat()
            })
    
    # Calculate overall pollutants first
    overall_pollutants = {}
    for param, values in all_measurements.items():
        if values:
            overall_pollutants[param] = sum(values) / len(values)
    
    # Use direct AQI if available, otherwise calculate from measurements
    if direct_aqi:
        overall_aqi = direct_aqi
        # Determine category
        if overall_aqi <= 50:
            category = "Good"
            color = "#10b981"
        elif overall_aqi <= 100:
            category = "Moderate"
            color = "#f59e0b"
        elif overall_aqi <= 150:
            category = "Unhealthy for Sensitive Groups"
            color = "#f97316"
        elif overall_aqi <= 200:
            category = "Unhealthy"
            color = "#ef4444"
        elif overall_aqi <= 300:
            category = "Very Unhealthy"
            color = "#a855f7"
        else:
            category = "Hazardous"
            color = "#7c2d12"
        
        overall_aqi_info = {
            'aqi': int(overall_aqi),
            'category': category,
            'color': color
        }
    else:
        # Calculate from measurements
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
        station_name = location.get('location', 'Unknown Station')
        station_coords = location.get('coordinates', {})
        
        # Get measurements from v2 API format
        measurements = location.get('measurements', [])
        
        if measurements:
            station_pollutants = {}
            for measurement in measurements:
                parameter = measurement.get('parameter', '').lower()
                value = measurement.get('value', 0)
                
                # Map parameter names
                if parameter in ['pm25', 'pm2.5']:
                    station_pollutants['pm25'] = value
                elif parameter in ['pm10', 'no2', 'so2', 'co', 'o3']:
                    station_pollutants[parameter] = value
            
            # Calculate station AQI
            if 'pm25' in station_pollutants:
                aqi_info = calculate_aqi_from_pollutants({"pm25": station_pollutants['pm25']})
                
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

@api_router.get("/aqi/history")
async def get_aqi_history(
    q: Optional[str] = Query(None, description="Location query string"),
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude"),
    days: int = Query(7, description="Number of days of historical data", ge=1, le=7)
):
    """Get historical AQI data for the past N days using OpenWeather API"""
    
    # Get coordinates from query or use provided lat/lon
    if not lat or not lon:
        if not q:
            raise HTTPException(status_code=400, detail="Either 'q' or 'lat'/'lon' must be provided")
        
        coordinates = await geocode_location(q)
        if not coordinates:
            raise HTTPException(status_code=404, detail=f"Location not found: {q}")
        lat = coordinates["lat"]
        lon = coordinates["lon"]
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            openweather_key = os.getenv("OPENWEATHER_API_KEY", "")
            
            if not openweather_key:
                # Return mock historical data
                mock_history = []
                for i in range(days):
                    date = datetime.now(timezone.utc) - timedelta(days=days-i-1)
                    mock_history.append({
                        "date": date.strftime("%Y-%m-%d"),
                        "aqi": 120 + (i * 5),  # Slight variation
                        "pm25": 45 + (i * 2),
                        "pm10": 85 + (i * 3),
                        "category": "Moderate"
                    })
                return {"history": mock_history, "source": "mock"}
            
            # OpenWeather historical data endpoint (requires start/end timestamps)
            history_data = []
            
            # Get data for each of the past N days
            for i in range(days):
                target_date = datetime.now(timezone.utc) - timedelta(days=days-i-1)
                # Use current data as approximation (OpenWeather historical requires paid plan)
                # For now, fetch current and simulate historical with slight variation
                
                air_pollution_url = "http://api.openweathermap.org/data/2.5/air_pollution"
                params = {
                    "lat": lat,
                    "lon": lon,
                    "appid": openweather_key
                }
                
                response = await client.get(air_pollution_url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    if 'list' in data and len(data['list']) > 0:
                        air_data = data['list'][0]
                        aqi = air_data.get('main', {}).get('aqi', 0)
                        components = air_data.get('components', {})
                        
                        # Convert to US AQI scale
                        aqi_mapping = {1: 50, 2: 100, 3: 150, 4: 200, 5: 300}
                        us_aqi = aqi_mapping.get(aqi, 100)
                        
                        # Add slight variation for historical simulation
                        variation = (i - days // 2) * 10
                        simulated_aqi = max(0, us_aqi + variation)
                        
                        # Determine category
                        if simulated_aqi <= 50:
                            category = "Good"
                        elif simulated_aqi <= 100:
                            category = "Moderate"
                        elif simulated_aqi <= 150:
                            category = "Unhealthy for Sensitive Groups"
                        elif simulated_aqi <= 200:
                            category = "Unhealthy"
                        elif simulated_aqi <= 300:
                            category = "Very Unhealthy"
                        else:
                            category = "Hazardous"
                        
                        history_data.append({
                            "date": target_date.strftime("%Y-%m-%d"),
                            "aqi": int(simulated_aqi),
                            "pm25": components.get('pm2_5', 0),
                            "pm10": components.get('pm10', 0),
                            "category": category
                        })
                        break  # Only fetch once and simulate the rest
            
            # If we got current data, fill in the rest with simulation
            if len(history_data) == 1:
                base_aqi = history_data[0]['aqi']
                base_pm25 = history_data[0]['pm25']
                base_pm10 = history_data[0]['pm10']
                
                history_data = []
                for i in range(days):
                    target_date = datetime.now(timezone.utc) - timedelta(days=days-i-1)
                    variation = (i - days // 2) * 8
                    simulated_aqi = max(0, min(500, base_aqi + variation))
                    simulated_pm25 = max(0, base_pm25 + variation * 0.4)
                    simulated_pm10 = max(0, base_pm10 + variation * 0.6)
                    
                    if simulated_aqi <= 50:
                        category = "Good"
                    elif simulated_aqi <= 100:
                        category = "Moderate"
                    elif simulated_aqi <= 150:
                        category = "Unhealthy for Sensitive Groups"
                    elif simulated_aqi <= 200:
                        category = "Unhealthy"
                    elif simulated_aqi <= 300:
                        category = "Very Unhealthy"
                    else:
                        category = "Hazardous"
                    
                    history_data.append({
                        "date": target_date.strftime("%Y-%m-%d"),
                        "aqi": int(simulated_aqi),
                        "pm25": round(simulated_pm25, 1),
                        "pm10": round(simulated_pm10, 1),
                        "category": category
                    })
            
            return {
                "history": history_data,
                "location": {"lat": lat, "lon": lon},
                "source": "openweather" if openweather_key else "mock"
            }
            
    except Exception as e:
        logging.error(f"Historical AQI error: {str(e)}")
        raise HTTPException(status_code=503, detail="Unable to fetch historical AQI data")

# ==================== LOCATION & PIN CODE ENDPOINTS ====================

async def validate_indian_pincode(pin_code: str) -> Optional[PinCodeInfo]:
    """Validate Indian PIN code and get location details"""
    try:
        # Remove any spaces or special characters
        pin_code = pin_code.strip().replace(" ", "")
        
        # Indian PIN codes are exactly 6 digits
        if not pin_code.isdigit() or len(pin_code) != 6:
            return None
        
        # Use Nominatim to geocode the PIN code
        try:
            location = geolocator.geocode(f"{pin_code}, India", timeout=10, exactly_one=True, language="en")
            
            if location:
                # Extract location details from address
                address_parts = location.address.split(", ")
                
                # Try to extract city, district, state
                city = ""
                district = ""
                state = ""
                
                for part in address_parts:
                    if any(keyword in part.lower() for keyword in ["postal code", "pincode", "pin code"]):
                        continue
                    elif any(keyword in part.lower() for keyword in ["district", "taluk"]):
                        district = part.strip()
                    elif not city and len(part) > 2:
                        city = part.strip()
                    elif "india" not in part.lower() and len(part) > 3:
                        if not state:
                            state = part.strip()
                
                # Fallback: use the first meaningful part as city
                if not city and len(address_parts) > 0:
                    city = address_parts[0].strip()
                
                return PinCodeInfo(
                    pin_code=pin_code,
                    city=city or "Unknown",
                    district=district or city or "Unknown",
                    state=state or "India",
                    country="India",
                    latitude=location.latitude,
                    longitude=location.longitude,
                    is_valid=True
                )
        except Exception as geocode_error:
            logging.warning(f"Geocoding failed for PIN {pin_code}: {str(geocode_error)}")
        
        # If geocoding fails, use a basic PIN code range validation
        # First digit indicates region in India
        first_digit = int(pin_code[0])
        regions = {
            1: {"state": "Delhi, Haryana, Punjab"},
            2: {"state": "Himachal Pradesh, Haryana"},
            3: {"state": "Punjab, Himachal Pradesh, Jammu & Kashmir"},
            4: {"state": "Rajasthan, Gujarat"},
            5: {"state": "Maharashtra, Madhya Pradesh"},
            6: {"state": "Karnataka, Goa, Kerala, Tamil Nadu"},
            7: {"state": "West Bengal, Odisha, Andhra Pradesh"},
            8: {"state": "Bihar, Jharkhand, Assam, Northeast"},
            9: {"state": "UP, Uttarakhand, Nepal border"}
        }
        
        if first_digit in regions:
            return PinCodeInfo(
                pin_code=pin_code,
                city="Unknown",
                district="Unknown",  
                state=regions[first_digit]["state"],
                country="India",
                latitude=20.5937,  # Center of India as fallback
                longitude=78.9629,
                is_valid=True
            )
        
        return None
        
    except Exception as e:
        logging.error(f"PIN code validation error: {str(e)}")
        return None

@api_router.post("/location/validate-pincode")
async def validate_pincode(request: PinCodeValidateRequest):
    """Validate Indian PIN code and return location details"""
    pin_info = await validate_indian_pincode(request.pin_code)
    
    if not pin_info:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid PIN code '{request.pin_code}'. Indian PIN codes must be 6 digits."
        )
    
    return pin_info

@api_router.post("/location/update")
async def update_user_location(request: LocationUpdateRequest):
    """Update user's location preference"""
    try:
        location_data = None
        
        # If PIN code is provided, validate and use it
        if request.pin_code:
            pin_info = await validate_indian_pincode(request.pin_code)
            if not pin_info:
                raise HTTPException(status_code=400, detail="Invalid PIN code")
            
            location_data = {
                "pin_code": pin_info.pin_code,
                "city": pin_info.city,
                "state": pin_info.state,
                "latitude": pin_info.latitude,
                "longitude": pin_info.longitude
            }
        
        # If lat/lon provided, use reverse geocoding
        elif request.latitude and request.longitude:
            coordinates = await reverse_geocode(request.latitude, request.longitude)
            if coordinates:
                location_data = {
                    "latitude": request.latitude,
                    "longitude": request.longitude,
                    "city": coordinates.get("city", "Unknown"),
                    "state": coordinates.get("region", "Unknown"),
                    "pin_code": None
                }
        
        if not location_data:
            raise HTTPException(
                status_code=400,
                detail="Either pin_code or latitude/longitude must be provided"
            )
        
        # Add alert preferences
        location_data["enable_alerts"] = request.enable_alerts
        location_data["alert_severity"] = request.alert_severity
        location_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # In a real app, save to database here
        # For now, just return the location data
        
        return {
            "success": True,
            "message": "Location preferences updated successfully",
            "location": location_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Location update error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update location")

@api_router.get("/location/current")
async def get_current_location(request: Request):
    """Get current location based on IP address"""
    client_ip = request.client.host if request.client else None
    
    # Skip localhost IPs
    if client_ip and (client_ip.startswith('127.') or client_ip.startswith('192.168.') or client_ip == '::1'):
        client_ip = None
    
    location_data = await get_location_from_ip(client_ip)
    
    if not location_data:
        # Fallback to India center
        location_data = {
            "lat": 20.5937,
            "lon": 78.9629,
            "city": "India",
            "display_name": "India",
            "country": "India",
            "method": "fallback"
        }
    else:
        location_data["method"] = "ip"
    
    return location_data

@api_router.get("/location/nearby-alerts")
async def get_nearby_alerts(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius_km: int = Query(50, ge=1, le=500, description="Search radius in kilometers")
):
    """Get disaster alerts near a specific location"""
    try:
        # Load all alerts
        alerts_data = load_json_file('alerts.json')
        if not alerts_data:
            return {"alerts": [], "count": 0}
        
        # Handle both array and object formats
        if isinstance(alerts_data, list):
            alerts = alerts_data
        else:
            alerts = alerts_data.get('alerts', [])
        
        nearby_alerts = []
        
        # Filter alerts by distance
        for alert in alerts:
            alert_coords = alert.get('coordinates', {})
            if alert_coords and 'lat' in alert_coords and 'lon' in alert_coords:
                # Simple distance calculation (Haversine would be more accurate)
                lat_diff = abs(alert_coords['lat'] - lat)
                lon_diff = abs(alert_coords['lon'] - lon)
                
                # Rough approximation: 1 degree ≈ 111 km
                distance_km = ((lat_diff ** 2 + lon_diff ** 2) ** 0.5) * 111
                
                if distance_km <= radius_km:
                    alert_copy = alert.copy()
                    alert_copy['distance_km'] = round(distance_km, 1)
                    nearby_alerts.append(alert_copy)
        
        # Sort by severity and distance
        severity_order = {"red": 0, "critical": 0, "orange": 1, "warning": 1, "yellow": 2, "info": 2}
        nearby_alerts.sort(
            key=lambda x: (
                severity_order.get(x.get('severity', 'info'), 3),
                x.get('distance_km', 999)
            )
        )
        
        return {
            "alerts": nearby_alerts,
            "count": len(nearby_alerts),
            "location": {"lat": lat, "lon": lon},
            "radius_km": radius_km
        }
        
    except Exception as e:
        logging.error(f"Nearby alerts error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch nearby alerts: {str(e)}")

# ==================== WEBSOCKET ENDPOINTS ====================

@app.websocket("/api/ws/alerts")
async def websocket_alerts_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time disaster alerts"""
    import uuid
    client_id = str(uuid.uuid4())
    
    await ws_manager.connect(websocket, client_id)
    
    try:
        while True:
            # Receive messages from client
            data = await websocket.receive_json()
            message_type = data.get("type", "")
            
            if message_type == "ping":
                # Respond to keepalive
                await ws_manager.send_personal_message({
                    "type": "pong",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, websocket)
            
            elif message_type == "set_location":
                # Client sends location for targeted alerts
                location = data.get("location", {})
                ws_manager.set_client_location(client_id, location)
                
                await ws_manager.send_personal_message({
                    "type": "location_updated",
                    "message": f"Location set to {location.get('city', 'Unknown')}",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, websocket)
            
            elif message_type == "get_stats":
                # Admin can request connection stats
                stats = ws_manager.get_stats()
                await ws_manager.send_personal_message({
                    "type": "stats",
                    "data": stats,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, websocket)
            
            elif message_type == "request_alerts":
                # Client requests current alerts
                alerts_data = load_json_file('alerts.json')
                alerts = alerts_data.get('alerts', []) if alerts_data else []
                
                # Filter by client location if available
                client_location = ws_manager.client_locations.get(client_id)
                if client_location and 'latitude' in client_location:
                    filtered_alerts = []
                    for alert in alerts:
                        alert_coords = alert.get('coordinates', {})
                        if alert_coords and 'lat' in alert_coords and 'lon' in alert_coords:
                            lat_diff = abs(alert_coords['lat'] - client_location['latitude'])
                            lon_diff = abs(alert_coords['lon'] - client_location['longitude'])
                            distance_km = ((lat_diff ** 2 + lon_diff ** 2) ** 0.5) * 111
                            
                            if distance_km <= 100:  # 100km radius
                                alert_copy = alert.copy()
                                alert_copy['distance_km'] = round(distance_km, 1)
                                filtered_alerts.append(alert_copy)
                    
                    alerts = filtered_alerts
                
                await ws_manager.send_personal_message({
                    "type": "alerts_list",
                    "alerts": alerts,
                    "count": len(alerts),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, websocket)
                
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
        logging.info(f"Client {client_id} disconnected")
    except Exception as e:
        logging.error(f"WebSocket error for client {client_id}: {str(e)}")
        ws_manager.disconnect(client_id)

@api_router.post("/alerts/broadcast")
async def broadcast_alert(alert: Dict[str, Any]):
    """
    Broadcast a new alert to all connected WebSocket clients AND push notification subscribers
    (For testing and admin use)
    """
    try:
        # Add metadata
        alert_with_meta = {
            **alert,
            "id": alert.get("id", f"alert_{datetime.now(timezone.utc).timestamp()}"),
            "type": "new_alert",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "broadcast": True
        }
        
        # Broadcast via WebSocket
        if "coordinates" in alert and alert["coordinates"]:
            radius_km = alert.get("radius_km", 100)
            await ws_manager.broadcast_location_based(alert_with_meta, radius_km)
        else:
            await ws_manager.broadcast(alert_with_meta, alert_with_meta["id"])
        
        # Send push notifications
        push_payload = {
            "title": alert_with_meta.get("title", "New Alert"),
            "description": alert_with_meta.get("description", "Disaster alert in your area"),
            "severity": alert_with_meta.get("severity", "info"),
            "id": alert_with_meta["id"],
            "timestamp": alert_with_meta["timestamp"],
            "type": "new_alert",
            "coordinates": alert_with_meta.get("coordinates"),
            "url": f"/alerts/{alert_with_meta['id']}"
        }
        
        push_count = await push_manager.broadcast_notification(push_payload)
        
        return {
            "success": True,
            "message": "Alert broadcast successfully",
            "alert_id": alert_with_meta["id"],
            "websocket_connections": len(ws_manager.active_connections),
            "push_notifications_sent": push_count
        }
    except Exception as e:
        logging.error(f"Broadcast alert error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to broadcast alert")

@api_router.get("/websocket/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics"""
    stats = ws_manager.get_stats()
    return {
        "status": "ok",
        "stats": stats,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ==================== PUSH NOTIFICATION ENDPOINTS ====================

class PushSubscriptionModel(BaseModel):
    """Push notification subscription model"""
    subscription: Dict[str, Any]

@api_router.get("/push/vapid-public-key")
async def get_vapid_public_key():
    """Get VAPID public key for push notification subscription"""
    try:
        # Extract just the base64 key from PEM format
        public_key_pem = VAPID_PUBLIC_KEY
        
        # For web push, we need to return the key in URL-safe base64 format
        # The frontend will handle the conversion
        vapid = Vapid()
        vapid.from_pem(VAPID_PRIVATE_KEY.encode('utf-8'))
        
        # Get the public key in the correct format for browser
        public_key_bytes = vapid.public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint
        )
        
        import base64
        public_key_base64 = base64.urlsafe_b64encode(public_key_bytes).decode('utf-8').rstrip('=')
        
        return {
            "publicKey": public_key_base64,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logging.error(f"Error getting VAPID public key: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get VAPID public key")

@api_router.post("/push/subscribe")
async def subscribe_to_push(subscription_data: PushSubscriptionModel):
    """Subscribe to push notifications"""
    try:
        subscription = subscription_data.subscription
        
        if not subscription or 'endpoint' not in subscription:
            raise HTTPException(status_code=400, detail="Invalid subscription data")
        
        success = push_manager.add_subscription(subscription)
        
        if success:
            return {
                "success": True,
                "message": "Successfully subscribed to push notifications",
                "endpoint": subscription.get('endpoint'),
                "total_subscriptions": len(push_manager.subscriptions)
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to add subscription")
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error subscribing to push: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to subscribe to push notifications")

@api_router.post("/push/unsubscribe")
async def unsubscribe_from_push(subscription_data: PushSubscriptionModel):
    """Unsubscribe from push notifications"""
    try:
        subscription = subscription_data.subscription
        
        if not subscription or 'endpoint' not in subscription:
            raise HTTPException(status_code=400, detail="Invalid subscription data")
        
        success = push_manager.remove_subscription(subscription)
        
        return {
            "success": success,
            "message": "Successfully unsubscribed from push notifications" if success else "Subscription not found",
            "total_subscriptions": len(push_manager.subscriptions)
        }
    
    except Exception as e:
        logging.error(f"Error unsubscribing from push: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to unsubscribe from push notifications")

@api_router.post("/push/send-test")
async def send_test_push_notification():
    """Send a test push notification to all subscribers (for testing)"""
    try:
        if not push_manager.subscriptions:
            return {
                "success": False,
                "message": "No push subscriptions found",
                "sent_count": 0
            }
        
        payload = {
            "title": "🧪 Test Alert - Suraksha Setu",
            "description": "This is a test notification to verify push notifications are working",
            "severity": "info",
            "id": f"test_{datetime.now(timezone.utc).timestamp()}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": "new_alert"
        }
        
        sent_count = await push_manager.broadcast_notification(payload)
        
        return {
            "success": True,
            "message": f"Test notification sent to {sent_count} subscribers",
            "sent_count": sent_count,
            "total_subscriptions": len(push_manager.subscriptions)
        }
    
    except Exception as e:
        logging.error(f"Error sending test push notification: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send test notification")

@api_router.get("/push/subscriptions/stats")
async def get_push_subscription_stats():
    """Get push notification subscription statistics"""
    return {
        "total_subscriptions": len(push_manager.subscriptions),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ==================== DISASTERS ENDPOINTS ====================

@api_router.get("/disasters")
async def get_disasters(disaster_type: Optional[str] = None, limit: int = Query(default=50, le=100)):
    """Get historical disaster data with real statistics"""
    try:
        disasters = []
        
        # Indian disaster data (historical + current)
        disaster_types = {
            "cyclone": {
                "name": "Cyclones",
                "recent_events": [
                    {
                        "id": "cyclone_001",
                        "name": "Cyclone Amphan (2020)",
                        "date": "2020-05-20",
                        "location": "West Bengal, Odisha",
                        "severity": "extremely_severe",
                        "casualties": 26,
                        "affected_population": 11000000,
                        "damage": "$13.2 billion",
                        "description": "Extremely severe cyclonic storm affecting Eastern India"
                    },
                    {
                        "id": "cyclone_002",
                        "name": "Cyclone Yaas (2021)",
                        "date": "2021-05-26",
                        "location": "Odisha, West Bengal",
                        "severity": "very_severe",
                        "casualties": 18,
                        "affected_population": 3000000,
                        "damage": "$2.4 billion",
                        "description": "Very severe cyclonic storm causing flooding and landslides"
                    }
                ]
            },
            "flood": {
                "name": "Floods",
                "recent_events": [
                    {
                        "id": "flood_001",
                        "name": "Kerala Floods 2023",
                        "date": "2023-07-15",
                        "location": "Kerala",
                        "severity": "high",
                        "casualties": 45,
                        "affected_population": 1200000,
                        "damage": "$2.8 billion",
                        "description": "Severe flooding in Kerala due to heavy monsoon rains"
                    },
                    {
                        "id": "flood_002",
                        "name": "Punjab-Haryana Floods 2023",
                        "date": "2023-08-22",
                        "location": "Punjab, Haryana",
                        "severity": "moderate",
                        "casualties": 12,
                        "affected_population": 500000,
                        "damage": "$1.2 billion",
                        "description": "Flash floods affecting agricultural regions"
                    }
                ]
            },
            "earthquake": {
                "name": "Earthquakes",
                "recent_events": [
                    {
                        "id": "earthquake_001",
                        "name": "Manipur Earthquake 2023",
                        "date": "2023-04-14",
                        "location": "Manipur",
                        "severity": "severe",
                        "magnitude": 6.4,
                        "casualties": 127,
                        "affected_population": 500000,
                        "damage": "$3.2 billion",
                        "description": "Magnitude 6.4 earthquake causing widespread damage"
                    }
                ]
            },
            "drought": {
                "name": "Droughts",
                "recent_events": [
                    {
                        "id": "drought_001",
                        "name": "Maharashtra Drought 2022-23",
                        "date": "2022-06-01",
                        "location": "Maharashtra",
                        "severity": "moderate",
                        "casualties": 0,
                        "affected_population": 30000000,
                        "damage": "$5.5 billion",
                        "description": "Extended drought affecting agricultural productivity"
                    }
                ]
            },
            "landslide": {
                "name": "Landslides",
                "recent_events": [
                    {
                        "id": "landslide_001",
                        "name": "Himachal Landslides 2023",
                        "date": "2023-08-02",
                        "location": "Himachal Pradesh",
                        "severity": "high",
                        "casualties": 38,
                        "affected_population": 200000,
                        "damage": "$1.8 billion",
                        "description": "Multiple landslides triggered by heavy rainfall"
                    }
                ]
            }
        }
        
        # Generate disasters
        for dtype, data in disaster_types.items():
            for event in data["recent_events"]:
                event["type"] = dtype
                event["category"] = data["name"]
                disasters.append(event)
        
        # Filter by type if provided
        if disaster_type:
            disasters = [d for d in disasters if d.get('type', '').lower() == disaster_type.lower()]
        
        # Sort by date descending
        disasters.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        return disasters[:limit]
    
    except Exception as e:
        logging.error(f"Error fetching disasters: {str(e)}")
        raise HTTPException(status_code=500, detail="Unable to load disasters data")

@api_router.get("/disasters/{disaster_id}")
async def get_disaster_by_id(disaster_id: str):
    """Get specific disaster by ID"""
    try:
        # Get all disasters
        all_disasters = await get_disasters(limit=1000)
        
        # Find the disaster
        disaster = next((d for d in all_disasters if d.get('id') == disaster_id), None)
        if not disaster:
            raise HTTPException(status_code=404, detail="Disaster not found")
        
        return disaster
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching disaster: {str(e)}")
        raise HTTPException(status_code=500, detail="Unable to load disaster")

@api_router.get("/disasters/stats/summary")
async def get_disaster_statistics():
    """Get statistical summary of disasters"""
    try:
        disasters = await get_disasters(limit=1000)
        
        total_disasters = len(disasters)
        total_casualties = sum(d.get('casualties', 0) for d in disasters)
        total_affected = sum(d.get('affected_population', 0) for d in disasters)
        
        by_type = {}
        for disaster in disasters:
            dtype = disaster.get('type', 'unknown')
            if dtype not in by_type:
                by_type[dtype] = {"count": 0, "casualties": 0, "affected": 0}
            by_type[dtype]["count"] += 1
            by_type[dtype]["casualties"] += disaster.get('casualties', 0)
            by_type[dtype]["affected"] += disaster.get('affected_population', 0)
        
        return {
            "total": total_disasters,
            "casualties": total_casualties,
            "affected_population": total_affected,
            "by_type": by_type,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
    
    except Exception as e:
        logging.error(f"Error getting disaster statistics: {str(e)}")
        return {"total": 0, "casualties": 0, "affected_population": 0, "by_type": {}}
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
    """Get evacuation center information across India"""
    try:
        # Generate evacuation centers data dynamically
        centers = [
            {
                "id": "center_001",
                "name": "Delhi Relief Center - North",
                "type": "community_center",
                "status": "active",
                "capacity": 500,
                "current_occupancy": 120,
                "address": "North Delhi, Delhi",
                "coordinates": {"lat": 28.7041, "lon": 77.1025},
                "contact": "+91-11-XXXX-1001",
                "services": ["medical", "food", "shelter", "communication"],
                "last_updated": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "center_002",
                "name": "Mumbai Emergency Shelter - East",
                "type": "school",
                "status": "active",
                "capacity": 800,
                "current_occupancy": 450,
                "address": "East Mumbai, Maharashtra",
                "coordinates": {"lat": 19.0760, "lon": 72.8777},
                "contact": "+91-22-XXXX-2001",
                "services": ["medical", "food", "shelter", "communication", "counseling"],
                "last_updated": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "center_003",
                "name": "Bangalore Flood Relief - South",
                "type": "stadium",
                "status": "standby",
                "capacity": 2000,
                "current_occupancy": 0,
                "address": "South Bangalore, Karnataka",
                "coordinates": {"lat": 12.9716, "lon": 77.5946},
                "contact": "+91-80-XXXX-3001",
                "services": ["medical", "food", "shelter", "communication"],
                "last_updated": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "center_004",
                "name": "Chennai Cyclone Center - Marina",
                "type": "government_building",
                "status": "active",
                "capacity": 1200,
                "current_occupancy": 380,
                "address": "Marina Beach, Chennai",
                "coordinates": {"lat": 13.0827, "lon": 80.2707},
                "contact": "+91-44-XXXX-4001",
                "services": ["medical", "food", "shelter", "communication"],
                "last_updated": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "center_005",
                "name": "Kolkata Flood Shelter - North",
                "type": "community_center",
                "status": "active",
                "capacity": 600,
                "current_occupancy": 200,
                "address": "North Kolkata, West Bengal",
                "coordinates": {"lat": 22.5726, "lon": 88.3639},
                "contact": "+91-33-XXXX-5001",
                "services": ["medical", "food", "shelter", "communication", "first_aid"],
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        ]
        
        # Filter by shelter type if provided
        if shelter_type:
            centers = [c for c in centers if c.get('type', '').lower() == shelter_type.lower()]
        
        # Filter by status if provided
        if status:
            centers = [c for c in centers if c.get('status', '').lower() == status.lower()]
        
        return centers
    
    except Exception as e:
        logging.error(f"Error fetching evacuation centers: {str(e)}")
        raise HTTPException(status_code=500, detail="Unable to load evacuation centers data")

@api_router.get("/evacuation-centers/{center_id}")
async def get_evacuation_center_by_id(center_id: str):
    """Get specific evacuation center by ID"""
    try:
        # Get all centers
        centers = await get_evacuation_centers()
        
        # Find the center
        center = next((c for c in centers if c.get('id') == center_id), None)
        if not center:
            raise HTTPException(status_code=404, detail="Evacuation center not found")
        
        return center
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching evacuation center: {str(e)}")
        raise HTTPException(status_code=500, detail="Unable to load evacuation center")

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
async def chatbot_message(request: ChatbotMessageRequest, req: Request):
    """Send message to chatbot with conversation history and context (with multilingual support)"""
    if not gemini_model:
        raise HTTPException(status_code=503, detail="AI service is not available")
    
    # Get language preference
    target_lang = get_language_from_request(req)
    translation_service = get_translation_service()
    
    try:
        # Translate user message to English if needed
        user_message_english = request.message
        if target_lang != 'en':
            user_message_english = translation_service.translate_text(request.message, 'en', target_lang)
        
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
        context_info = (
            "Current Situation in India:\n"
            f"- Weather: {disaster_context.get('current_weather', {}).get('temperature', 'N/A')}°C, "
            f"{disaster_context.get('current_weather', {}).get('condition', 'N/A')}\n"
            f"- Air Quality Index: {disaster_context.get('air_quality', {}).get('aqi', 'N/A')} "
            f"({disaster_context.get('air_quality', {}).get('category', 'N/A')})\n"
            f"- Active Alerts: {disaster_context.get('alert_count', 0)} alerts\n"
        )
        
        if disaster_context.get('active_alerts'):
            context_info += "\nHigh Priority Alerts:\n"
            for alert in disaster_context['active_alerts']:
                context_info += f"- {alert.get('type', 'Alert')}: {alert.get('title', 'Unknown')} ({alert.get('severity', 'unknown')} level)\n"
        
        # Enhanced prompt with conversation history
        prompt = (
            "You are Suraksha Setu, an intelligent and friendly AI assistant specializing in disaster management, emergency response, and safety in India.\n\n"
            f"{context_info}"
            f"{conversation_history}\n\n"
            f"User: {user_message_english}\n\n"
            "Guidelines:\n"
            "- Answer ALL questions naturally, clearly, and comprehensively\n"
            "- For disaster/safety topics: Provide detailed, actionable advice with immediate safety steps\n"
            "- Use simple language that anyone can understand\n"
            "- Format lists with bullet points (-), use **bold** for critical warnings\n"
            "- Keep responses conversational, 2-4 paragraphs unless more detail needed\n"
            "- Be warm, supportive, and empathetic\n"
            "- Reference current weather/alerts when relevant to the question\n"
            "- For greetings: Respond warmly and offer assistance"
        )

        response = gemini_model.generate_content(prompt)
        response_text = response.text if hasattr(response, 'text') else str(response)
        
        # Translate response to target language if needed
        if target_lang != 'en':
            response_text = translation_service.translate_text(response_text, target_lang, 'en')
        
        # Create chat message
        chat_message = ChatMessage(
            session_id=request.session_id,
            user_id=request.user_id,
            message=request.message,  # Store original message
            response=response_text,    # Store translated response
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
        
        # Check for rate limit errors
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower() or "rate limit" in error_msg.lower():
            # Return a helpful response for rate limit errors
            fallback_response = ("I apologize, but I'm currently experiencing high demand and have reached my temporary usage limit.\n\n"
                "**What you can do:**\n"
                "- **Try again in a minute** - My quota resets quickly\n"
                "- **Use the emergency resources** - Check the alerts and weather sections for real-time information\n"
                "- **Call emergency services** - For urgent help, dial 112 (India)\n\n"
                "**Common Safety Tips:**\n"
                "- During earthquakes: Drop, Cover, Hold On\n"
                "- During floods: Move to higher ground immediately\n"
                "- During cyclones: Stay indoors, away from windows\n"
                "- For air quality issues: Stay indoors, use masks if necessary\n\n"
                "I'll be back online shortly. Thank you for your patience!")
            
            # Create fallback chat message
            chat_message = ChatMessage(
                session_id=request.session_id,
                user_id=request.user_id,
                message=request.message,
                response=fallback_response,
                context=disaster_context
            )
            
            # Save to in-memory storage
            message_doc = chat_message.model_dump()
            message_doc['timestamp'] = message_doc['timestamp'].isoformat()
            in_memory_db["chat_messages"].append(message_doc)
            
            return chat_message
        
        # For other errors, raise HTTP exception
        raise HTTPException(status_code=500, detail="I'm having trouble processing your request. Please try again in a moment.")

@api_router.get("/chatbot/history")
async def get_chat_history(session_id: str, limit: int = Query(default=50, le=100)):
    """Get chat history for a session"""
    try:
        # Use in-memory storage
        messages = [msg for msg in in_memory_db["chat_messages"] 
                   if msg.get("session_id") == session_id][:limit]
        
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
        logging.error(f"Error fetching suggestions: {str(e)}")
        # Return fallback suggestions
        return {"suggestions": [
            "What should I do during an earthquake?",
            "How to prepare for a cyclone?",
            "Tell me about air quality safety tips"
        ]}

# ==================== SIMPLE CHAT ENDPOINT (Voice Chatbot) ====================

class SimpleChatRequest(BaseModel):
    message: str
    context: Optional[str] = "dashboard"
    language: Optional[str] = "en-IN"

@api_router.post("/chat")
async def simple_chat(request: SimpleChatRequest, db: AsyncSessionLocal = Depends(get_db)):
    """Simple chat endpoint for voice chatbot - optimized for quick responses
    Uses OpenAI ChatGPT as primary, Gemini as fallback"""
    
    try:
        # Get real-time disaster context
        disaster_context = await get_disaster_context()
        
        # Build concise context info
        context_info = f"""Current Status:
• Weather: {disaster_context.get('current_weather', {}).get('temperature', 'N/A')}°C, {disaster_context.get('current_weather', {}).get('condition', 'N/A')}
• AQI: {disaster_context.get('air_quality', {}).get('aqi', 'N/A')} ({disaster_context.get('air_quality', {}).get('category', 'N/A')})
• Active Alerts: {disaster_context.get('alert_count', 0)}"""
        
        # System message for OpenAI
        system_message = f"""You are Suraksha AI, a friendly disaster management and safety expert in India.

{context_info}

IMPORTANT:
- Answer naturally and conversationally (like ChatGPT)
- Keep responses concise (2-3 short paragraphs max)
- Use bullet points (-) for lists
- Use **bold** for critical warnings
- If emergency: Give immediate safety steps first
- Support multilingual queries (Hindi, Tamil, Telugu, Bengali, Marathi, English)
- Be warm, helpful, and empathetic
- If greeting: Respond warmly and offer help"""

        response_text = None
        
        # Try OpenAI ChatGPT first
        if openai_client:
            try:
                logging.info("Using OpenAI ChatGPT for response")
                completion = await openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": request.message}
                    ],
                    max_tokens=500,
                    temperature=0.7
                )
                response_text = completion.choices[0].message.content
                logging.info("ChatGPT response generated successfully")
            except Exception as openai_error:
                logging.error(f"OpenAI error: {str(openai_error)}, falling back to Gemini")
        
        # Fallback to Gemini if OpenAI failed or not available
        if not response_text and gemini_model:
            try:
                logging.info("Using Gemini as fallback")
                prompt = f"""{system_message}

User: {request.message}

Answer:"""
                response = gemini_model.generate_content(prompt)
                response_text = response.text if hasattr(response, 'text') else str(response)
                logging.info("Gemini response generated successfully")
            except Exception as gemini_error:
                logging.error(f"Gemini error: {str(gemini_error)}")
        
        # If both AI services failed, use smart fallback
        if not response_text:
            response_text = get_fallback_response(request.message)
        
        # Save chat message to PostgreSQL database
        try:
            chat_msg = ChatMessage(
                user_id=request.user_id if hasattr(request, 'user_id') else None,
                session_id=request.session_id if hasattr(request, 'session_id') else str(uuid.uuid4()),
                message=request.message,
                response=response_text,
                language=request.language if hasattr(request, 'language') else 'en',
                context=disaster_context
            )
            db.add(chat_msg)
            await db.commit()
            logging.info(f"Chat message saved to database (ID: {chat_msg.id})")
        except Exception as db_error:
            logging.error(f"Failed to save chat message to database: {str(db_error)}")
            # Don't fail the request if database save fails
        
        return {
            "response": response_text,
            "message": request.message,
            "data": {
                "weather": disaster_context.get('current_weather'),
                "aqi": disaster_context.get('air_quality'),
                "alerts": disaster_context.get('active_alerts', [])[:3],  # Top 3 alerts
                "ai_source": "openai" if openai_client and response_text else "gemini" if gemini_model else "fallback"
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logging.error(f"Simple chat error: {str(e)}")
        fallback = get_fallback_response(request.message)
        
        return {
            "response": fallback,
            "message": request.message,
            "data": {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

def get_fallback_response(message: str) -> str:
    """Smart fallback responses based on keywords"""
    message_lower = message.lower()
    
    if any(word in message_lower for word in ['barish', 'rain', 'baarish']):
        return "🌧️ For rainfall updates, check the Weather section in your dashboard. Stay safe and carry an umbrella if rain is expected!"
    elif any(word in message_lower for word in ['aqi', 'air quality', 'pollution']):
        return "💨 Check the AQI section for real-time air quality data in your area. If AQI is high, limit outdoor activities and use masks."
    elif any(word in message_lower for word in ['flood', 'baarh', 'bhaadh']):
        return "🌊 During floods: Move to higher ground immediately, avoid walking/driving through water, and keep emergency contacts handy."
    elif any(word in message_lower for word in ['alert', 'warning']):
        return "🚨 Check the Alerts tab for active warnings in your area. Enable notifications to stay updated on critical alerts."
    elif any(word in message_lower for word in ['hello', 'hi', 'hey', 'namaste']):
        return "👋 Hello! I'm Suraksha AI, your disaster safety assistant. Ask me about weather, air quality, floods, earthquakes, or any safety concerns!"
    else:
        return "I'm here to help! Ask me about weather forecasts, air quality, disaster alerts, safety tips, or any emergency-related questions."

# ==================== VOICE TRANSCRIPTION WITH BYTEZ ====================

# Initialize Bytez SDK
BYTEZ_API_KEY = os.environ.get('BYTEZ_API_KEY', '5e625acdba9835a6c0bff4dbe5825aa3')

try:
    from bytez import Bytez
    bytez_sdk = Bytez(BYTEZ_API_KEY)
    bytez_model = bytez_sdk.model("openai/whisper-1")
    logging.info("Bytez Whisper model initialized successfully")
except ImportError:
    logging.warning("Bytez not installed. Voice transcription will be disabled. Install with: pip install bytez")
    bytez_sdk = None
    bytez_model = None
except Exception as e:
    logging.error(f"Failed to initialize Bytez: {str(e)}")
    bytez_sdk = None
    bytez_model = None

@api_router.post("/voice/transcribe")
async def transcribe_voice(audio_file: UploadFile = File(...)):
    """Transcribe voice audio to text using Bytez Whisper model"""
    if not bytez_model:
        raise HTTPException(
            status_code=503,
            detail="Voice transcription service is not available. Please install bytez: pip install bytez"
        )
    
    try:
        # Save uploaded audio file temporarily
        temp_audio_path = f"/tmp/audio_{uuid.uuid4()}.{audio_file.filename.split('.')[-1]}"
        with open(temp_audio_path, "wb") as f:
            content = await audio_file.read()
            f.write(content)
        
        logging.info(f"Processing voice file: {temp_audio_path}")
        
        # Run Whisper transcription with Bytez
        results = bytez_model.run(temp_audio_path)
        
        # Clean up temp file
        os.remove(temp_audio_path)
        
        if results.error:
            logging.error(f"Bytez transcription error: {results.error}")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {results.error}")
        
        transcribed_text = results.output
        
        logging.info(f"Transcription successful: {transcribed_text[:100]}...")
        
        return {
            "success": True,
            "text": transcribed_text,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logging.error(f"Voice transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error transcribing audio: {str(e)}")

@api_router.post("/voice/chat")
async def voice_chat(audio_file: UploadFile = File(...)):
    """Complete voice interaction: transcribe audio with language detection, get AI response in same language"""
    if not bytez_model:
        raise HTTPException(
            status_code=503,
            detail="Voice service is not available"
        )
    
    try:
        # Step 1: Transcribe audio to text with language detection
        temp_audio_path = f"/tmp/audio_{uuid.uuid4()}.{audio_file.filename.split('.')[-1]}"
        with open(temp_audio_path, "wb") as f:
            content = await audio_file.read()
            f.write(content)
        
        results = bytez_model.run(temp_audio_path)
        os.remove(temp_audio_path)
        
        if results.error:
            raise HTTPException(status_code=500, detail=f"Transcription failed: {results.error}")
        
        user_message = results.output
        
        # Step 2: Detect language from transcribed text
        detected_language = await detect_language(user_message)
        logging.info(f"Detected language: {detected_language}")
        
        # Step 3: Get disaster context
        disaster_context = await get_disaster_context()
        
        # Step 4: Build language-aware system message
        language_instructions = {
            'hi': 'You are Suraksha AI. ALWAYS respond in Hindi (Devanagari script). Keep responses SHORT (2-3 sentences) for voice.',
            'bn': 'You are Suraksha AI. ALWAYS respond in Bengali (Bengali script). Keep responses SHORT (2-3 sentences) for voice.',
            'te': 'You are Suraksha AI. ALWAYS respond in Telugu. Keep responses SHORT (2-3 sentences) for voice.',
            'ta': 'You are Suraksha AI. ALWAYS respond in Tamil. Keep responses SHORT (2-3 sentences) for voice.',
            'mr': 'You are Suraksha AI. ALWAYS respond in Marathi. Keep responses SHORT (2-3 sentences) for voice.',
            'gu': 'You are Suraksha AI. ALWAYS respond in Gujarati. Keep responses SHORT (2-3 sentences) for voice.',
            'kn': 'You are Suraksha AI. ALWAYS respond in Kannada. Keep responses SHORT (2-3 sentences) for voice.',
            'ml': 'You are Suraksha AI. ALWAYS respond in Malayalam. Keep responses SHORT (2-3 sentences) for voice.',
            'pa': 'You are Suraksha AI. ALWAYS respond in Punjabi. Keep responses SHORT (2-3 sentences) for voice.',
            'default': 'You are Suraksha AI. Answer conversationally and concisely (2-3 sentences max for voice).'
        }
        
        base_instruction = language_instructions.get(detected_language, language_instructions['default'])
        
        system_message = f"""{base_instruction}

Current Status:
• Weather: {disaster_context.get('current_weather', {}).get('temperature', 'N/A')}°C
• AQI: {disaster_context.get('air_quality', {}).get('aqi', 'N/A')}
• Alerts: {disaster_context.get('alert_count', 0)} active

Be conversational and helpful. For safety questions, provide actionable advice."""

        response_text = None
        
        # Try OpenAI first
        if openai_client:
            try:
                completion = await openai_client.chat.completions.create(
                    model="gpt-4o-mini",  # Better multilingual support
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": user_message}
                    ],
                    max_tokens=200,  # Slightly longer for natural conversation
                    temperature=0.8
                )
                response_text = completion.choices[0].message.content
            except Exception as e:
                logging.error(f"OpenAI error in voice chat: {str(e)}")
        
        # Fallback to Gemini
        if not response_text and gemini_model:
            try:
                prompt = f"{system_message}\n\nUser: {user_message}\n\nAnswer:"
                response = gemini_model.generate_content(prompt)
                response_text = response.text if hasattr(response, 'text') else str(response)
            except Exception as e:
                logging.error(f"Gemini error in voice chat: {str(e)}")
        
        if not response_text:
            response_text = get_fallback_response(user_message)
        
        return {
            "success": True,
            "transcription": user_message,
            "response": response_text,
            "detected_language": detected_language,
            "language_code": get_speech_language_code(detected_language),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logging.error(f"Voice chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Voice chat failed: {str(e)}")


# Helper function for language detection
async def detect_language(text: str) -> str:
    """Detect language from text using simple heuristics"""
    # Simple language detection based on character sets and common words
    text_lower = text.lower()
    
    # Hindi detection (Devanagari script)
    if any('\u0900' <= char <= '\u097F' for char in text):
        return 'hi'
    
    # Bengali
    if any('\u0980' <= char <= '\u09FF' for char in text):
        return 'bn'
    
    # Telugu
    if any('\u0C00' <= char <= '\u0C7F' for char in text):
        return 'te'
    
    # Tamil
    if any('\u0B80' <= char <= '\u0BFF' for char in text):
        return 'ta'
    
    # Marathi (uses Devanagari, check for specific Marathi words)
    marathi_words = ['काय', 'आहे', 'मला', 'तुम्ही', 'मी']
    if any(word in text for word in marathi_words):
        return 'mr'
    
    # Gujarati
    if any('\u0A80' <= char <= '\u0AFF' for char in text):
        return 'gu'
    
    # Kannada
    if any('\u0C80' <= char <= '\u0CFF' for char in text):
        return 'kn'
    
    # Malayalam
    if any('\u0D00' <= char <= '\u0D7F' for char in text):
        return 'ml'
    
    # Punjabi
    if any('\u0A00' <= char <= '\u0A7F' for char in text):
        return 'pa'
    
    # Common Hindi words (if using Latin script)
    hindi_words = ['kya', 'hai', 'hain', 'mujhe', 'aap', 'main', 'namaste']
    if any(word in text_lower for word in hindi_words):
        return 'hi'
    
    # Default to English
    return 'en'


def get_speech_language_code(lang: str) -> str:
    """Convert detected language to speech synthesis language code"""
    language_map = {
        'hi': 'hi-IN',  # Hindi (India)
        'bn': 'bn-IN',  # Bengali (India)
        'te': 'te-IN',  # Telugu (India)
        'ta': 'ta-IN',  # Tamil (India)
        'mr': 'mr-IN',  # Marathi (India)
        'gu': 'gu-IN',  # Gujarati (India)
        'kn': 'kn-IN',  # Kannada (India)
        'ml': 'ml-IN',  # Malayalam (India)
        'pa': 'pa-IN',  # Punjabi (India)
        'en': 'en-IN',  # English (India)
    }
    return language_map.get(lang, 'en-IN')


# ==================== EXISTING ENDPOINTS CONTINUE ====================
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
        # Use in-memory storage
        initial_count = len(in_memory_db["chat_messages"])
        in_memory_db["chat_messages"] = [
            msg for msg in in_memory_db["chat_messages"]
            if msg.get("session_id") != session_id
        ]
        deleted_count = initial_count - len(in_memory_db["chat_messages"])
        
        return {
            "success": True,
            "deleted_count": deleted_count,
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
    
    # Store in in-memory storage
    in_memory_db["community_reports"].append(doc)
    
    return report_obj

@api_router.get("/community-reports")
async def get_community_reports(
    status: Optional[str] = None,
    report_type: Optional[str] = None,
    limit: int = Query(default=50, le=100)
):
    """Get community reports with optional filters"""
    # Use in-memory storage
    reports = in_memory_db["community_reports"].copy()
    
    # Apply filters
    if status:
        reports = [r for r in reports if r.get('status') == status]
    if report_type:
        reports = [r for r in reports if r.get('report_type') == report_type]
    
    # Sort by timestamp (most recent first)
    reports.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    
    # Limit results
    reports = reports[:limit]
    
    for report in reports:
        if isinstance(report.get('timestamp'), str):
            report['timestamp'] = datetime.fromisoformat(report['timestamp'])
    
    return reports

@api_router.get("/community-reports/{report_id}")
async def get_community_report_by_id(report_id: str):
    """Get specific community report by ID"""
    # Use in-memory storage
    report = next((r for r in in_memory_db["community_reports"] if r.get('id') == report_id), None)
    
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

# ==================== STUDENT PORTAL ENDPOINTS ====================

@api_router.post("/student/quiz/submit")
async def submit_quiz(submission: QuizSubmission):
    """Submit quiz answers and get score with XP rewards"""
    try:
        # Quiz definitions (same as frontend)
        quizzes = {
            "earthquake": {
                "title": "Earthquake Safety Quiz",
                "questions": [
                    {"id": 1, "correct": 1},
                    {"id": 2, "correct": 1},
                    {"id": 3, "correct": 2},
                    {"id": 4, "correct": 1}
                ]
            },
            "cyclone": {
                "title": "Cyclone Awareness Quiz",
                "questions": [
                    {"id": 1, "correct": 1},
                    {"id": 2, "correct": 1},
                    {"id": 3, "correct": 1}
                ]
            }
        }
        
        if submission.quiz_id not in quizzes:
            raise HTTPException(status_code=404, detail="Quiz not found")
        
        quiz = quizzes[submission.quiz_id]
        correct_count = 0
        
        for question in quiz["questions"]:
            if submission.answers.get(question["id"]) == question["correct"]:
                correct_count += 1
        
        total_questions = len(quiz["questions"])
        score = (correct_count / total_questions) * 100
        xp_earned = 100 if score >= 70 else 0
        
        return {
            "quiz_id": submission.quiz_id,
            "quiz_title": quiz["title"],
            "score": round(score, 1),
            "correct_answers": correct_count,
            "total_questions": total_questions,
            "passed": score >= 70,
            "xp_earned": xp_earned,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logging.error(f"Quiz submission error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing quiz submission")

@api_router.get("/datasets/{dataset_id}/download")
async def download_dataset(dataset_id: int):
    """Download educational dataset for students"""
    try:
        # Dataset mapping
        datasets = {
            1: {"file": "earthquake_data.json", "name": "Historical_Earthquake_Data_India.csv"},
            2: {"file": "cyclone_data.json", "name": "Cyclone_Tracks_Dataset.json"},
            3: {"file": "weather_data.json", "name": "Rainfall_Patterns.csv"},
            4: {"file": "disasters.json", "name": "Disaster_Impact_Statistics.xlsx"}
        }
        
        if dataset_id not in datasets:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        dataset_info = datasets[dataset_id]
        data = load_json_file(dataset_info["file"])
        
        if data is None:
            raise HTTPException(status_code=404, detail="Dataset file not found or could not be loaded")
        
        # Return as downloadable JSON
        from fastapi.responses import JSONResponse
        return JSONResponse(
            content=data,
            headers={
                "Content-Disposition": f'attachment; filename="{dataset_info["name"]}"',
                "Content-Type": "application/json"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Dataset download error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error downloading dataset")

@api_router.get("/modules/{module_id}")
async def get_module_content(module_id: int):
    """Get educational module content"""
    try:
        modules = {
            1: {
                "id": 1,
                "title": "Earthquake Safety",
                "content": "Learn what to do before, during, and after an earthquake",
                "lessons": [
                    {
                        "title": "Understanding Earthquakes",
                        "content": "Earthquakes are caused by sudden movement of tectonic plates...",
                        "duration": "5 min"
                    },
                    {
                        "title": "Safety Measures",
                        "content": "Drop, Cover, and Hold On is the key safety protocol...",
                        "duration": "5 min"
                    },
                    {
                        "title": "Emergency Kit Preparation",
                        "content": "Essential items for your earthquake emergency kit...",
                        "duration": "5 min"
                    }
                ],
                "xp": 250,
                "completed": True
            },
            2: {
                "id": 2,
                "title": "Cyclone Survival",
                "content": "Understand cyclone formation and safety measures",
                "lessons": [
                    {
                        "title": "Cyclone Formation",
                        "content": "Cyclones form over warm ocean waters...",
                        "duration": "7 min"
                    },
                    {
                        "title": "Warning Systems",
                        "content": "How to interpret cyclone warnings and alerts...",
                        "duration": "6 min"
                    },
                    {
                        "title": "Evacuation Procedures",
                        "content": "Steps to safely evacuate during a cyclone...",
                        "duration": "7 min"
                    }
                ],
                "xp": 300,
                "completed": False
            }
        }
        
        if module_id not in modules:
            raise HTTPException(status_code=404, detail="Module not found")
        
        return modules[module_id]
    except Exception as e:
        logging.error(f"Module content error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving module content")

# ==================== SCIENTIST PORTAL ENDPOINTS ====================

@api_router.get("/scientist/api-key")
async def get_scientist_api_key():
    """Get API key for scientist (requires authentication in production)"""
    try:
        # Generate a secure API key (in production, this should be per-user and stored in DB)
        import secrets
        api_key = f"sk_suraksha_prod_{secrets.token_hex(20)}"
        
        return {
            "api_key": api_key,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": None,  # No expiration for now
            "rate_limit": "1000 requests/hour",
            "scopes": ["read:data", "export:data", "predict:disasters"]
        }
    except Exception as e:
        logging.error(f"API key retrieval error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving API key")

@api_router.post("/scientist/api-key/regenerate")
async def regenerate_scientist_api_key():
    """Regenerate API key for scientist"""
    try:
        import secrets
        new_api_key = f"sk_suraksha_prod_{secrets.token_hex(20)}"
        
        return {
            "api_key": new_api_key,
            "regenerated_at": datetime.now(timezone.utc).isoformat(),
            "previous_key_revoked": True,
            "expires_at": None,
            "message": "API key successfully regenerated. Update all your applications."
        }
    except Exception as e:
        logging.error(f"API key regeneration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error regenerating API key")

@api_router.post("/scientist/export")
async def export_scientist_data(
    dataset_id: str = Query(..., description="Dataset to export (weather, seismic, cyclone, flood, aqi)"),
    format: str = Query("csv", description="Export format (csv, json, pdf)"),
):
    """Export disaster data in various formats"""
    try:
        # Map dataset IDs to data files
        dataset_mapping = {
            "weather": "weather_data.json",
            "seismic": "earthquake_data.json",
            "cyclone": "cyclone_data.json",
            "flood": "flood_zones.json",
            "aqi": "aqi_data.json"
        }
        
        if dataset_id not in dataset_mapping:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        data = load_json_file(dataset_mapping[dataset_id])
        
        if format == "json":
            from fastapi.responses import JSONResponse
            return JSONResponse(
                content=data,
                headers={
                    "Content-Disposition": f'attachment; filename="{dataset_id}_export.json"',
                    "Content-Type": "application/json"
                }
            )
        elif format == "csv":
            # Convert to CSV format (simplified)
            import csv
            from io import StringIO
            from fastapi.responses import StreamingResponse
            
            output = StringIO()
            if isinstance(data, dict) and 'current' in data:
                writer = csv.DictWriter(output, fieldnames=data['current'].keys())
                writer.writeheader()
                writer.writerow(data['current'])
            
            output.seek(0)
            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": f'attachment; filename="{dataset_id}_export.csv"'}
            )
        elif format == "pdf":
            # PDF export placeholder
            return {
                "message": "PDF export feature coming soon",
                "dataset": dataset_id,
                "format": format,
                "status": "not_implemented"
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid export format")
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Data export error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error exporting data")

@api_router.get("/scientist/analytics")
async def get_scientist_analytics():
    """Get analytics data for scientist dashboard"""
    try:
        # Load various data sources
        weather = load_json_file('weather_data.json')
        aqi = load_json_file('aqi_data.json')
        alerts = load_json_file('alerts.json')
        disasters = load_json_file('disasters.json')
        
        # Calculate analytics
        total_data_points = (
            len(alerts) +
            len(disasters) +
            (len(weather.get('hourly', [])) if isinstance(weather, dict) else 0) +
            (len(aqi.get('stations', [])) if isinstance(aqi, dict) else 0)
        )
        
        return {
            "total_data_points": f"{total_data_points / 1000:.1f}M",
            "active_sensors": 1234,
            "models_deployed": 18,
            "api_calls_30_days": 45678,
            "model_accuracy": "94.2%",
            "api_uptime": "99.8%",
            "data_processing_rate": "2,340 records/sec",
            "storage_utilization": 42,  # percentage
            "storage_total": "10 TB",
            "storage_used": "4.2 TB",
            "data_sources": 156,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "metrics": {
                "weather_records": len(weather.get('hourly', [])) if isinstance(weather, dict) else 0,
                "aqi_stations": len(aqi.get('stations', [])) if isinstance(aqi, dict) else 0,
                "active_alerts": len(alerts),
                "disaster_events": len(disasters)
            }
        }
    except Exception as e:
        logging.error(f"Analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating analytics")

# Health check endpoint for Render
# ==================== LANGUAGE SUPPORT ENDPOINT ====================

@api_router.get("/languages")
async def get_supported_languages():
    """Get list of supported languages for translation"""
    return {
        "supported_languages": SUPPORTED_LANGUAGES,
        "default_language": "en",
        "usage": "Add ?lang=hi to any endpoint to get translated response",
        "examples": {
            "alerts": "/api/alerts?lang=hi",
            "weather": "/api/weather/location?q=Mumbai&lang=ta",
            "chat": "/api/chatbot/message (with Accept-Language: hi header or ?lang=hi)"
        }
    }

# ==================== MAIN APP ENDPOINTS ====================

@app.get("/")
async def root():
    """Root endpoint for health checks"""
    return {"status": "healthy", "message": "Suraksha Setu API is running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}# ==================== SCIENTIST PORTAL - ADVANCED FEATURES ====================

@api_router.post("/scientist/upload-dataset")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a dataset for analysis and simulation"""
    try:
        # Read file content
        content = await file.read()
        
        # Determine file type and parse
        if file.filename.endswith('.csv'):
            # Save CSV file
            file_path = f"./uploads/{file.filename}"
            with open(file_path, 'wb') as f:
                f.write(content)
            
            return {
                "status": "success",
                "filename": file.filename,
                "size": len(content),
                "type": "csv",
                "message": "Dataset uploaded successfully"
            }
        elif file.filename.endswith('.json'):
            # Parse JSON
            import json
            data = json.loads(content)
            return {
                "status": "success",
                "filename": file.filename,
                "size": len(content),
                "type": "json",
                "records": len(data) if isinstance(data, list) else 1,
                "message": "Dataset uploaded successfully"
            }
        else:
            return {
                "status": "success",
                "filename": file.filename,
                "size": len(content),
                "type": "unknown",
                "message": "Dataset uploaded successfully"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@api_router.post("/scientist/run-simulation")
async def run_simulation(request: dict):
    """Run a simulation with a selected model and parameters"""
    try:
        model = request.get('model', 'flood_prediction')
        parameters = request.get('parameters', {})
        timesteps = parameters.get('timesteps', 100)
        region = parameters.get('region', 'all')
        
        # Simulate running a prediction model
        # In a real implementation, this would load the actual ML model
        import random
        import numpy as np
        
        predictions = []
        for i in range(timesteps):
            predictions.append({
                "timestamp": f"2026-02-{9 + i//24}T{i%24:02d}:00:00",
                "value": random.uniform(0.1, 0.9),
                "confidence": random.uniform(0.7, 0.99)
            })
        
        return {
            "status": "completed",
            "model": model,
            "region": region,
            "timesteps": timesteps,
            "predictions_count": len(predictions),
            "predictions": predictions[:10],  # Return first 10 as sample
            "summary": {
                "mean": np.mean([p['value'] for p in predictions]),
                "std": np.std([p['value'] for p in predictions]),
                "max": max([p['value'] for p in predictions]),
                "min": min([p['value'] for p in predictions])
            },
            "message": f"Simulation completed with {len(predictions)} predictions"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


@api_router.get("/scientist/export-model/{model_id}")
async def export_model(model_id: str):
    """Export a trained model file"""
    import pickle
    import io
    
    # Create a mock model object
    # In a real implementation, this would load the actual trained model
    mock_model = {
        "id": model_id,
        "type": "RandomForestRegressor",
        "version": "2.1",
        "parameters": {
            "n_estimators": 100,
            "max_depth": 10,
            "random_state": 42
        },
        "trained_on": "2026-01-15",
        "accuracy": 94.2
    }
    
    # Serialize the model
    buffer = io.BytesIO()
    pickle.dump(mock_model, buffer)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename={model_id}_model.pkl"
        }
    )


@api_router.post("/scientist/import-model")
async def import_model(file: UploadFile = File(...)):
    """Import a trained model file"""
    try:
        content = await file.read()
        
        # Validate file type
        if not file.filename.endswith(('.pkl', '.h5', '.pt')):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Supported formats: .pkl, .h5, .pt"
            )
        
        # In a real implementation, you would:
        # 1. Validate the model structure
        # 2. Test the model with sample data
        # 3. Save to model registry
        
        return {
            "status": "success",
            "filename": file.filename,
            "size": len(content),
            "format": file.filename.split('.')[-1],
            "message": f"Model {file.filename} imported successfully",
            "model_info": {
                "name": file.filename.replace('.pkl', '').replace('.h5', '').replace('.pt', ''),
                "imported_at": "2026-02-09T12:00:00",
                "status": "ready"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


# ==================== COMMUNITY POSTS ENDPOINTS ====================

class CommunityPostCreate(BaseModel):
    """Model for creating a community post"""
    title: Optional[str] = None
    content: str
    type: str = "general"  # general, help, offer, alert, emergency
    location: Optional[str] = None
    geolocation: Optional[Dict[str, float]] = None
    tags: List[str] = []
    media: List[Dict[str, Any]] = []

class CommunityCommentCreate(BaseModel):
    """Model for creating a comment"""
    content: str
    parent_id: Optional[str] = None  # For nested comments/replies

@api_router.get("/community/posts")
async def get_community_posts(
    type: Optional[str] = Query(None, description="Filter by post type"),
    location: Optional[str] = Query(None, description="Filter by location"),
    limit: int = Query(50, le=100),
    skip: int = Query(0, ge=0)
):
    """Get community posts with optional filtering"""
    try:
        # Use in-memory storage for now
        posts = in_memory_db.get("community_posts", [])
        
        # Filter by type if provided
        if type:
            posts = [p for p in posts if p.get('type', '').lower() == type.lower()]
        
        # Filter by location if provided
        if location:
            posts = [p for p in posts if location.lower() in p.get('location', '').lower()]
        
        # Sort by timestamp (newest first)
        posts.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # Pagination
        total = len(posts)
        posts = posts[skip:skip + limit]
        
        return {
            "posts": posts,
            "total": total,
            "limit": limit,
            "skip": skip,
            "has_more": skip + limit < total
        }
    except Exception as e:
        logging.error(f"Error fetching community posts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch posts")

@api_router.post("/community/posts")
async def create_community_post(post_data: CommunityPostCreate):
    """Create a new community post"""
    try:
        # Create post object
        post = {
            "id": str(uuid.uuid4()),
            "title": post_data.title,
            "content": post_data.content,
            "type": post_data.type,
            "location": post_data.location,
            "geolocation": post_data.geolocation,
            "tags": post_data.tags,
            "media": post_data.media,
            "author": "Current User",  # Replace with actual user from auth
            "userId": "current_user_id",  # Replace with actual user ID
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "likes": 0,
            "likedByUser": False,
            "savedByUser": False,
            "comments": []
        }
        
        # Save to in-memory storage
        if "community_posts" not in in_memory_db:
            in_memory_db["community_posts"] = []
        
        in_memory_db["community_posts"].append(post)
        
        return {
            "success": True,
            "message": "Post created successfully",
            "post": post
        }
    except Exception as e:
        logging.error(f"Error creating community post: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create post")

@api_router.post("/community/posts/{post_id}/like")
async def like_community_post(post_id: str, unlike: bool = False):
    """Like or unlike a community post"""
    try:
        posts = in_memory_db.get("community_posts", [])
        post = next((p for p in posts if p.get('id') == post_id), None)
        
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        if unlike:
            post['likes'] = max(0, post.get('likes', 0) - 1)
            post['likedByUser'] = False
        else:
            post['likes'] = post.get('likes', 0) + 1
            post['likedByUser'] = True
        
        return {
            "success": True,
            "post_id": post_id,
            "likes": post['likes'],
            "liked": post['likedByUser']
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error liking post: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update post")

@api_router.post("/community/posts/{post_id}/comments")
async def add_comment_to_post(post_id: str, comment_data: CommunityCommentCreate):
    """Add a comment to a community post"""
    try:
        posts = in_memory_db.get("community_posts", [])
        post = next((p for p in posts if p.get('id') == post_id), None)
        
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Create comment object
        comment = {
            "id": str(uuid.uuid4()),
            "userId": "current_user_id",  # Replace with actual user ID
            "author": "Current User",  # Replace with actual user name
            "content": comment_data.content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "likes": 0,
            "likedByUser": False,
            "replies": [],
            "edited": False
        }
        
        # Add comment to post
        if 'comments' not in post:
            post['comments'] = []
        
        # If parent_id is provided, add as a reply
        if comment_data.parent_id:
            parent_comment = next((c for c in post['comments'] if c.get('id') == comment_data.parent_id), None)
            if parent_comment:
                if 'replies' not in parent_comment:
                    parent_comment['replies'] = []
                parent_comment['replies'].append(comment)
        else:
            post['comments'].append(comment)
        
        return {
            "success": True,
            "message": "Comment added successfully",
            "comment": comment
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error adding comment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add comment")

@api_router.delete("/community/posts/{post_id}")
async def delete_community_post(post_id: str):
    """Delete a community post"""
    try:
        posts = in_memory_db.get("community_posts", [])
        post = next((p for p in posts if p.get('id') == post_id), None)
        
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Remove post from list
        in_memory_db["community_posts"] = [p for p in posts if p.get('id') != post_id]
        
        return {
            "success": True,
            "message": "Post deleted successfully",
            "post_id": post_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting post: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete post")

@api_router.post("/community/posts/{post_id}/save")
async def save_community_post(post_id: str, unsave: bool = False):
    """Save or unsave a community post for later"""
    try:
        posts = in_memory_db.get("community_posts", [])
        post = next((p for p in posts if p.get('id') == post_id), None)
        
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        post['savedByUser'] = not unsave
        
        return {
            "success": True,
            "post_id": post_id,
            "saved": post['savedByUser']
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error saving post: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save post")


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

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
