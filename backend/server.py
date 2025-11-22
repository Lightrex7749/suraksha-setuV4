from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import json
import google.generativeai as genai

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configure Gemini AI
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-2.0-flash-exp')
else:
    gemini_model = None
    logging.warning("Gemini API key not found. AI features will be disabled.")

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

@api_router.post("/ai-assistant")
async def ai_assistant(request: AIQueryRequest):
    """AI-powered assistant using Gemini for disaster-related queries"""
    if not gemini_model:
        raise HTTPException(status_code=503, detail="AI service is not available")
    
    try:
        # Build context-aware prompt
        context = request.context or "disaster management and safety"
        prompt = f"""You are Suraksha Setu AI Assistant, an expert in disaster management, environmental safety, and emergency response in India.

Context: {context}

User Query: {request.query}

Provide a helpful, accurate, and actionable response. Keep it concise but informative. If it's about an emergency, prioritize safety instructions."""

        response = gemini_model.generate_content(prompt)
        
        return {
            "query": request.query,
            "response": response.text,
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
    client.close()
