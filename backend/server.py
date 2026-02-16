"""
Suraksha Setu API v3.0 – Production Server
Routes: AI (chat, voice, vision), Alerts, Admin, Playbook, Notifications, Geo, Community
"""
from fastapi import (
    FastAPI, APIRouter, HTTPException, Depends, Request,
    WebSocket, WebSocketDisconnect, UploadFile, File,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from contextlib import asynccontextmanager
import logging
import os
import io
import uuid
import json
import base64
from datetime import datetime, timezone
from dotenv import load_dotenv

# Core modules
from database import init_db, close_db, get_db, AsyncSessionLocal, AILog, Alert
from notifications import ws_manager, push_manager
from risk_engine import RiskEngine
from playbook import playbook_engine
from utils.redis_client import redis_client

# AI modules
from ai.orchestrator import orchestrator
from ai.openai_client import ai_client, TOTAL_TOKEN_LIMIT
from ai.vision_pipeline import analyze_community_image, save_upload
from ai.voice_pipeline import process_voice_query

# Data ingestion
from ingest.manager import IngestionManager

# Rate limiting
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

# Geo utility
from geopy.geocoders import Nominatim

# Load Environment
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

REDIS_TOKEN_KEY = "openai:total_tokens_used"

# ──────────────────────────────────────────────────────────────
#  LIFESPAN
# ──────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Initializing Suraksha Setu v3.0...")

    await init_db()

    await redis_client.connect()
    r = await redis_client.get_client()
    if r:
        await FastAPILimiter.init(r)
        logger.info("✅ Redis + Rate Limiter ready")
    else:
        logger.warning("⚠️  Redis unavailable – caching/rate-limiting disabled")

    logger.info("✅ Suraksha Setu Backend Online")
    yield

    await close_db()
    await redis_client.close()
    logger.info("🛑 Shutdown complete")


# ──────────────────────────────────────────────────────────────
#  APP
# ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="Suraksha Setu API",
    version="3.0.0",
    description="AI-Powered Disaster Management Platform for India",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════
#  AI ROUTES
# ══════════════════════════════════════════════════════════════
ai_router = APIRouter(prefix="/api/ai", tags=["AI"])


@ai_router.post("", dependencies=[Depends(RateLimiter(times=10, seconds=60))])
@ai_router.post("/chat", dependencies=[Depends(RateLimiter(times=10, seconds=60))])
async def ai_chat(request: Request):
    """
    Unified AI Chat Endpoint.
    Body: { "role": "citizen", "message"|"query": "...", "context": {...} }
    Supports: text queries, function calling, RAG (scientist)
    """
    data = await request.json()
    role = data.get("role", "citizen")
    message = data.get("message") or data.get("query", "")
    context = data.get("context", {})

    # Pass through widget-specific fields
    if data.get("rag_mode"):
        context["rag_mode"] = True
    if data.get("report_mode"):
        context["report_mode"] = data["report_mode"]
    if data.get("locale"):
        context["locale"] = data["locale"]

    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    result = await orchestrator.route_request(role, message, context)

    # Log to ai_logs
    usage = result.get("usage") or {}
    try:
        async with AsyncSessionLocal() as db:
            log = AILog(
                id=str(uuid.uuid4()),
                endpoint="chat",
                model=usage.get("model", "gpt-4o-mini"),
                prompt_tokens=usage.get("prompt", 0),
                completion_tokens=usage.get("completion", 0),
                total_tokens=usage.get("total", usage.get("total_tokens", 0)),
                role=role,
                tool_calls=result.get("tool_calls_executed"),
            )
            db.add(log)
            await db.commit()
    except Exception as e:
        logger.warning(f"AI log write failed: {e}")

    # Reshape response for frontend widgets
    return {
        "success": result.get("success", True),
        "response": result.get("message", ""),
        "answer": result.get("message", ""),
        "role": role,
        "confidence": result.get("confidence", 0.65),
        "token_cost": result.get("token_cost", 0),
        "sources": result.get("sources", []),
        "cached": result.get("cached", False),
        "quiz": result.get("quiz"),
        "tool_calls_executed": result.get("tool_calls_executed", []),
        "usage": usage,
    }


from ai.voice_pipeline import process_voice_query

@ai_router.post("/voice", dependencies=[Depends(RateLimiter(times=5, seconds=60))])
async def ai_voice(
    file: UploadFile = File(...),
    role: str = "citizen",
    language: str = None,
):
    """
    Voice Query Endpoint (Whisper + Orchestrator).
    Accepts audio file → transcribes → routes to AI → returns transcript + response.
    """
    if not file.content_type or not file.content_type.startswith("audio"):
        raise HTTPException(status_code=400, detail="Audio file required")

    audio_bytes = await file.read()
    if len(audio_bytes) > 25 * 1024 * 1024:  # 25MB Whisper limit
        raise HTTPException(status_code=413, detail="Audio file too large (max 25MB)")

    result = await process_voice_query(
        audio_bytes=audio_bytes,
        filename=file.filename or "voice.wav",
        role=role,
        language=language,
    )

    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])

    # Log voice usage
    try:
        async with AsyncSessionLocal() as db:
            log = AILog(
                id=str(uuid.uuid4()),
                endpoint="voice",
                model="whisper-1",
                total_tokens=0, # specific to audio
                role=role,
                tool_calls=None
            )
            db.add(log)
            await db.commit()
    except Exception as e:
        logger.warning(f"Voice log failed: {e}")

    return result


@ai_router.post("/vision", dependencies=[Depends(RateLimiter(times=5, seconds=60))])
async def ai_vision(request: Request):
    """
    Vision Analysis Endpoint.
    Body: { "image_url": "https://...", "description": "..." }
    OR multipart form with image file.
    Analyses disaster images and classifies severity.
    """
    content_type = request.headers.get("content-type", "")

    if "multipart" in content_type:
        form = await request.form()
        image_file = form.get("image")
        description = form.get("description", "")
        if not image_file:
            raise HTTPException(status_code=400, detail="Image file required")
        img_bytes = await image_file.read()
        b64 = base64.b64encode(img_bytes).decode()
        image_source = f"data:image/jpeg;base64,{b64}"
    else:
        data = await request.json()
        image_source = data.get("image_url")
        description = data.get("description", "")
        if not image_source:
            raise HTTPException(status_code=400, detail="image_url required")

    result = await analyze_community_image(image_source, description)

    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@ai_router.post("/tts", dependencies=[Depends(RateLimiter(times=5, seconds=60))])
async def ai_tts(request: Request):
    """
    Text-to-Speech Endpoint.
    Body: { "text": "...", "voice": "alloy", "speed": 1.0 }
    Returns audio/mpeg stream.
    """
    data = await request.json()
    text = data.get("text", "")
    voice = data.get("voice", "alloy")
    speed = data.get("speed", 1.0)

    if not text:
        raise HTTPException(status_code=400, detail="text required")

    result = await ai_client.text_to_speech(text, voice=voice, speed=speed)
    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])

    return StreamingResponse(
        io.BytesIO(result["audio_bytes"]),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "attachment; filename=speech.mp3"},
    )


# ══════════════════════════════════════════════════════════════
#  ALERT ROUTES
# ══════════════════════════════════════════════════════════════
api_router = APIRouter(prefix="/api", tags=["Core"])


@api_router.get("/alerts")
async def get_alerts(lat: float = None, lon: float = None, db: AsyncSession = Depends(get_db)):
    """Get active alerts with optional geo-filtering."""
    query = select(Alert).where(Alert.is_active == True, Alert.retracted == False)
    result = await db.execute(query.order_by(Alert.created_at.desc()).limit(50))
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
        ]
    }


@api_router.post("/admin/ingest")
async def trigger_ingest(db: AsyncSession = Depends(get_db)):
    """Manual trigger for data ingestion cycle."""
    await IngestionManager.run_ingest_cycle(db)
    return {"status": "Ingestion Cycle Triggered"}


# ══════════════════════════════════════════════════════════════
#  PLAYBOOK
# ══════════════════════════════════════════════════════════════
@api_router.get("/playbook/actions")
async def get_playbook_actions(risk_type: str, severity: str, role: str = "citizen"):
    """Get deterministic SOP actions for a scenario."""
    actions = playbook_engine.get_actions(risk_type, severity, role)
    return {"actions": actions}


# ══════════════════════════════════════════════════════════════
#  NOTIFICATIONS
# ══════════════════════════════════════════════════════════════
@api_router.post("/notifications/subscribe")
async def subscribe_push(subscription: dict):
    success = push_manager.add_subscription(subscription)
    return {"success": success}


@api_router.post("/notifications/broadcast")
async def broadcast_alert(payload: dict):
    """Admin endpoint to broadcast alert."""
    count = await push_manager.broadcast_notification(payload)
    await ws_manager.broadcast(payload)
    return {"sent_push": count, "sent_ws": "all"}


@api_router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await ws_manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            pass
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)


# ══════════════════════════════════════════════════════════════
#  ADMIN / AI USAGE MONITORING
# ══════════════════════════════════════════════════════════════
admin_router = APIRouter(prefix="/admin", tags=["Admin"])


@admin_router.get("/ai/usage")
async def ai_usage_stats():
    """Get AI token usage statistics and budget status."""
    try:
        r = await redis_client.get_client()
        used = int(await r.get(REDIS_TOKEN_KEY) or 0) if r else 0
    except Exception:
        used = 0

    # DB stats
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(
                    func.count(AILog.id),
                    func.sum(AILog.total_tokens),
                ).where(AILog.error.is_(None))
            )
            row = result.one()
            db_calls = row[0] or 0
            db_tokens = row[1] or 0
    except Exception:
        db_calls, db_tokens = 0, 0

    return {
        "redis_tokens_used": used,
        "db_total_calls": db_calls,
        "db_total_tokens": db_tokens,
        "budget_limit": TOTAL_TOKEN_LIMIT,
        "budget_remaining": max(0, TOTAL_TOKEN_LIMIT - used),
        "budget_used_pct": round(used / TOTAL_TOKEN_LIMIT * 100, 2) if TOTAL_TOKEN_LIMIT else 0,
    }


@admin_router.get("/ai/logs")
async def ai_logs(limit: int = 50):
    """Get recent AI call logs."""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(AILog).order_by(AILog.created_at.desc()).limit(limit)
            )
            logs = result.scalars().all()
            return {
                "logs": [
                    {
                        "id": l.id,
                        "endpoint": l.endpoint,
                        "model": l.model,
                        "total_tokens": l.total_tokens,
                        "role": l.role,
                        "tool_calls": l.tool_calls,
                        "cached": l.cached,
                        "error": l.error,
                        "created_at": str(l.created_at),
                    }
                    for l in logs
                ]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════
#  SAFETY SCORE
# ══════════════════════════════════════════════════════════════
@api_router.get("/safety-score")
async def get_safety_score(
    latitude: float = None, longitude: float = None,
    db: AsyncSession = Depends(get_db)
):
    """Compute safety score based on nearby alerts and risk factors."""
    # Get active alerts
    result = await db.execute(
        select(Alert).where(Alert.is_active == True, Alert.retracted == False)
    )
    alerts = result.scalars().all()

    base_score = 90
    critical = sum(1 for a in alerts if a.severity in ("critical", "red"))
    warning = sum(1 for a in alerts if a.severity in ("warning", "orange"))
    base_score -= critical * 15 + warning * 5
    base_score = max(0, min(100, base_score))

    return {
        "total_score": base_score,
        "breakdown": {
            "location_risk": max(0, 100 - critical * 20),
            "weather_risk": max(0, 100 - warning * 10),
            "disaster_proximity": 100 if not alerts else max(0, 100 - len(alerts) * 8),
            "infrastructure": 85,
        },
        "active_alerts": len(alerts),
    }


# ══════════════════════════════════════════════════════════════
#  USER PHONE REGISTRATION (for SMS alerts)
# ══════════════════════════════════════════════════════════════
from sms_service import phone_registry, alert_dispatcher, sms_service
from pydantic import BaseModel as PydanticBaseModel

class PhoneRegistrationRequest(PydanticBaseModel):
    uid: str
    phone: str
    email: str = ""
    name: str = ""

@api_router.post("/users/register-phone")
async def register_phone(req: PhoneRegistrationRequest):
    """Register a phone number for SMS alerts."""
    phone_registry.register(
        uid=req.uid,
        phone=req.phone,
        email=req.email,
        name=req.name,
    )
    return {"success": True, "registered": phone_registry.count}


@api_router.get("/users/phone-count")
async def phone_count():
    return {"registered_phones": phone_registry.count}


@api_router.get("/sms/audit-log")
async def sms_audit_log(limit: int = 50):
    """Get SMS dispatch audit trail."""
    return {"logs": alert_dispatcher.get_sms_audit_log(limit)}


@api_router.get("/sms/status")
async def sms_status():
    """Check SMS service availability and thresholds."""
    return {
        "twilio_available": sms_service.is_available,
        "registered_phones": phone_registry.count,
        "thresholds": {
            "auto_notify": 0.70,
            "admin_review_high": 0.70,
            "admin_review_low": 0.45,
            "vision_auto_alert": 0.85,
            "vision_manual_review": 0.60,
        },
    }


# ══════════════════════════════════════════════════════════════
#  EVACUATION CENTERS
# ══════════════════════════════════════════════════════════════
@api_router.get("/evacuation-centers")
async def get_evacuation_centers(lat: float = None, lon: float = None):
    """Return known evacuation / relief centers."""
    # Static seed data – in production, this would come from DB
    centers = [
        {"id": "evac_1", "name": "District Hospital Shelter", "type": "hospital",
         "coordinates": {"lat": 28.6139, "lon": 77.2090}, "capacity": 500, "status": "open"},
        {"id": "evac_2", "name": "Community Relief Camp", "type": "relief_camp",
         "coordinates": {"lat": 28.6200, "lon": 77.2150}, "capacity": 300, "status": "open"},
        {"id": "evac_3", "name": "School Emergency Shelter", "type": "school",
         "coordinates": {"lat": 28.6100, "lon": 77.2000}, "capacity": 200, "status": "open"},
    ]
    return centers


# ══════════════════════════════════════════════════════════════
#  PUSH VAPID KEY
# ══════════════════════════════════════════════════════════════
@api_router.get("/push/vapid-public-key")
async def get_vapid_public_key():
    """Return the VAPID public key for push subscriptions."""
    from notifications import VAPID_PUBLIC_KEY
    return {"publicKey": VAPID_PUBLIC_KEY}


# ══════════════════════════════════════════════════════════════
#  GRID ZONE RISK + AR OVERLAY
# ══════════════════════════════════════════════════════════════
from grid_risk import grid_risk_service

@api_router.get("/grid/zone-risk")
async def get_zone_risk(lat: float, lon: float, radius_km: float = 10.0):
    """
    Main endpoint: GPS → 10km grid cells → risk states → AR overlay.
    Multiple users in the same area share grid state (credit-safe).
    """
    radius_km = min(radius_km, 50.0)  # Cap at 50km
    result = await grid_risk_service.get_zone_risk(lat, lon, radius_km)
    return result


@api_router.get("/grid/ar-overlay")
async def get_ar_overlay(lat: float, lon: float, radius_km: float = 10.0):
    """
    AR-specific endpoint: returns only the overlay payload.
    AR visualizes last validated state — never reasons.
    """
    radius_km = min(radius_km, 50.0)
    result = await grid_risk_service.get_zone_risk(lat, lon, radius_km)
    return result["ar_overlay"]


@api_router.post("/grid/refresh")
async def force_refresh_grid(lat: float, lon: float, radius_km: float = 10.0):
    """Force-refresh grid cells (admin/ingestion use)."""
    radius_km = min(radius_km, 50.0)
    await grid_risk_service.force_refresh(lat, lon, radius_km)
    return {"status": "refreshed", "lat": lat, "lon": lon, "radius_km": radius_km}


# ══════════════════════════════════════════════════════════════
#  UTILITY
# ══════════════════════════════════════════════════════════════
@api_router.get("/geo/reverse")
async def reverse_geocode(lat: float, lon: float):
    geolocator = Nominatim(user_agent="suraksha_setu_backend")
    try:
        location = geolocator.reverse((lat, lon), language='en')
        return {"address": location.address} if location else {"address": "Unknown"}
    except Exception as e:
        logger.error(f"Geocode Error: {e}")
        return {"address": "Unknown"}


# ══════════════════════════════════════════════════════════════
#  REGISTER ROUTERS
# ══════════════════════════════════════════════════════════════
app.include_router(ai_router)
app.include_router(api_router)
app.include_router(admin_router)

# Weather & AQI routes
from routes.weather import weather_router
app.include_router(weather_router)

# Risk & Anomaly Detection routes
from routes.risk import risk_router
app.include_router(risk_router)

# Community routes
from routes.community import community_router
app.include_router(community_router)

# Disasters routes
from routes.disasters import disasters_router
app.include_router(disasters_router)

# Location routes
from routes.location import location_router
app.include_router(location_router)

# Scientist routes
from routes.scientist import scientist_router
app.include_router(scientist_router)

# Include admin routes from routes/ if exists
try:
    from routes.admin import router as admin_routes_router
    app.include_router(admin_routes_router)
except ImportError:
    pass



@app.get("/")
def read_root():
    return {
        "status": "Suraksha Setu API v3.0 Online",
        "ai_features": [
            "chat", "function_calling", "whisper", "vision",
            "embeddings", "rag", "tts", "agents",
        ],
        "modules": {
            "ai_orchestrator": "active",
            "risk_engine": "active",
            "playbook": "active",
            "notifications": "active",
            "vision_pipeline": "active",
            "voice_pipeline": "active",
            "rag_system": "active",
        },
    }


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Suraksha Setu Backend Server...")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
