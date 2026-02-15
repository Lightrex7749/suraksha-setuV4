"""
OpenAI Function-Callable Tools
Each tool exposes an OpenAI function schema + an execute() coroutine.
"""
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
#  TOOL SCHEMAS  (OpenAI function-calling format)
# ═══════════════════════════════════════════════════════════════

DB_QUERY_SCHEMA = {
    "name": "query_database",
    "description": "Query Suraksha Setu database for alerts, users, or community reports",
    "parameters": {
        "type": "object",
        "properties": {
            "table": {
                "type": "string",
                "enum": ["alerts", "users", "community_reports", "mosdac_metadata"],
                "description": "Table to query",
            },
            "filters": {
                "type": "object",
                "description": "Key-value filter conditions",
            },
            "limit": {"type": "integer", "description": "Max records", "default": 10},
        },
        "required": ["table"],
    },
}

NOTIFICATION_SCHEMA = {
    "name": "send_notification",
    "description": "Send a push notification or SMS to users in an affected area",
    "parameters": {
        "type": "object",
        "properties": {
            "message": {"type": "string", "description": "Notification body"},
            "severity": {
                "type": "string",
                "enum": ["info", "warning", "critical"],
            },
            "target_area": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number"},
                    "lon": {"type": "number"},
                    "radius_km": {"type": "number"},
                },
            },
        },
        "required": ["message", "severity"],
    },
}

PLAYBOOK_SCHEMA = {
    "name": "get_playbook_actions",
    "description": "Retrieve official SOP actions for a given disaster type, severity and user role",
    "parameters": {
        "type": "object",
        "properties": {
            "risk_type": {"type": "string", "enum": ["flood", "cyclone", "earthquake", "aqi", "tsunami"]},
            "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
            "user_role": {"type": "string", "enum": ["citizen", "farmer", "student"]},
        },
        "required": ["risk_type", "severity"],
    },
}

MOSDAC_DOWNLOAD_SCHEMA = {
    "name": "download_mosdac_data",
    "description": "Trigger MOSDAC satellite data download for a specific region and dataset",
    "parameters": {
        "type": "object",
        "properties": {
            "dataset_id": {"type": "string", "description": "MOSDAC dataset ID"},
            "lat": {"type": "number"},
            "lon": {"type": "number"},
            "radius_km": {"type": "number", "default": 50},
        },
        "required": ["dataset_id", "lat", "lon"],
    },
}

PUBLISH_ADVISORY_SCHEMA = {
    "name": "publish_advisory",
    "description": "Create and publish a new advisory alert through the system",
    "parameters": {
        "type": "object",
        "properties": {
            "alert_type": {"type": "string"},
            "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
            "title": {"type": "string"},
            "description": {"type": "string"},
            "location": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number"},
                    "lon": {"type": "number"},
                    "city": {"type": "string"},
                },
            },
        },
        "required": ["alert_type", "severity", "title", "description"],
    },
}

# All schemas in one list for convenience
ALL_TOOL_SCHEMAS = [
    DB_QUERY_SCHEMA,
    NOTIFICATION_SCHEMA,
    PLAYBOOK_SCHEMA,
    MOSDAC_DOWNLOAD_SCHEMA,
    PUBLISH_ADVISORY_SCHEMA,
]


# ═══════════════════════════════════════════════════════════════
#  TOOL EXECUTORS
# ═══════════════════════════════════════════════════════════════

async def execute_query_database(table: str, filters: dict = None, limit: int = 10) -> Dict:
    """Execute a database query tool call."""
    from database import AsyncSessionLocal, Alert, User, CommunityReport, MOSDACMetadata
    from sqlalchemy import select

    table_map = {
        "alerts": Alert,
        "users": User,
        "community_reports": CommunityReport,
        "mosdac_metadata": MOSDACMetadata,
    }
    model_cls = table_map.get(table)
    if not model_cls:
        return {"error": f"Unknown table: {table}"}

    try:
        async with AsyncSessionLocal() as db:
            query = select(model_cls).limit(limit)
            result = await db.execute(query)
            rows = result.scalars().all()
            return {
                "table": table,
                "count": len(rows),
                "records": [
                    {c.name: str(getattr(r, c.name, ""))
                     for c in model_cls.__table__.columns
                     if c.name not in ("geom",)}
                    for r in rows
                ],
            }
    except Exception as e:
        logger.error(f"DB query tool error: {e}")
        return {"error": str(e)}


async def execute_send_notification(message: str, severity: str, target_area: dict = None) -> Dict:
    """Execute a notification tool call."""
    from notifications import ws_manager, push_manager

    payload = {"title": f"Suraksha Setu [{severity.upper()}]", "body": message}
    try:
        push_count = await push_manager.broadcast_notification(payload)
        await ws_manager.broadcast({"type": "alert", "severity": severity, "message": message})
        return {"sent_push": push_count, "sent_ws": True}
    except Exception as e:
        logger.error(f"Notification tool error: {e}")
        return {"error": str(e)}


async def execute_get_playbook_actions(risk_type: str, severity: str, user_role: str = "citizen") -> Dict:
    """Execute playbook retriever."""
    from playbook import playbook_engine

    actions = playbook_engine.get_actions(risk_type, severity, user_role)
    return {"risk_type": risk_type, "severity": severity, "role": user_role, "actions": actions}


async def execute_download_mosdac_data(dataset_id: str, lat: float, lon: float, radius_km: float = 50) -> Dict:
    """Trigger MOSDAC download (Layer 2+3)."""
    from ingest.mosdac_metadata import metadata_poller

    token = await metadata_poller.get_token()
    if not token:
        return {"error": "MOSDAC authentication failed"}

    from ingest.mosdac_downloader import MOSDACDownloader
    downloader = MOSDACDownloader(access_token=token)
    files = await downloader.download_for_event(
        event_location={"lat": lat, "lon": lon},
        dataset_ids=[dataset_id],
        radius_km=radius_km,
    )
    return {"downloaded_files": files, "count": len(files)}


async def execute_publish_advisory(alert_type: str, severity: str, title: str, description: str, location: dict = None) -> Dict:
    """Publish a new advisory (with safeguard check)."""
    from alert_safeguards import safeguard
    from risk_engine import RiskEngine

    severity_scores = {"low": 0.2, "medium": 0.5, "high": 0.7, "critical": 0.9}
    score = severity_scores.get(severity, 0.5)

    decision = safeguard.evaluate_alert_safety(risk_score=score, alert_source="manual")
    if not decision.should_notify and not decision.requires_human_review:
        return {"published": False, "reason": decision.reason}

    return {
        "published": decision.should_notify,
        "requires_review": decision.requires_human_review,
        "alert": {"type": alert_type, "severity": severity, "title": title},
    }


# ═══════════════════════════════════════════════════════════════
#  DISPATCH MAP
# ═══════════════════════════════════════════════════════════════
TOOL_EXECUTORS = {
    "query_database": execute_query_database,
    "send_notification": execute_send_notification,
    "get_playbook_actions": execute_get_playbook_actions,
    "download_mosdac_data": execute_download_mosdac_data,
    "publish_advisory": execute_publish_advisory,
}
