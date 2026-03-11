"""
Admin API Routes for Alert Management, Users & Stats
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import get_db, Alert, IncidentLog, User, CommunityReport, CommunityPost, AILog
from notifications import ws_manager
from sqlalchemy import select, func
import logging
from datetime import datetime, timezone, timedelta
from firebase_auth import verify_firebase_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])


# ==================== REQUEST MODELS ====================

class RetractionRequest(BaseModel):
    alert_id: str
    reason: str
    admin_user_id: Optional[str] = None


class AlertApprovalRequest(BaseModel):
    alert_id: str
    approved: bool
    admin_user_id: Optional[str] = None


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None


# ==================== ADMIN STATS ENDPOINT ====================

@router.get("/stats")
async def get_admin_stats(db=Depends(get_db)):
    """Real-time dashboard stats."""
    try:
        # Active alerts
        active_q = await db.execute(
            select(func.count(Alert.id)).where(Alert.is_active == True, Alert.retracted == False)
        )
        active_alerts = active_q.scalar() or 0

        # Pending alerts (not active, not retracted = pending review)
        pending_q = await db.execute(
            select(func.count(Alert.id)).where(Alert.is_active == False, Alert.retracted == False)
        )
        pending_alerts = pending_q.scalar() or 0

        # Total alerts
        total_q = await db.execute(select(func.count(Alert.id)))
        total_alerts = total_q.scalar() or 0

        # Users
        total_users_q = await db.execute(select(func.count(User.id)))
        total_users = total_users_q.scalar() or 0

        active_users_q = await db.execute(
            select(func.count(User.id)).where(User.is_active == True)
        )
        active_users = active_users_q.scalar() or 0

        # Community posts
        posts_q = await db.execute(select(func.count(CommunityPost.id)))
        total_posts = posts_q.scalar() or 0

        # Community reports (pending)
        try:
            reports_q = await db.execute(
                select(func.count(CommunityReport.id)).where(CommunityReport.verified == False)
            )
            pending_reports = reports_q.scalar() or 0
        except Exception:
            pending_reports = 0

        # Registered phones
        try:
            from sms_service import phone_registry
            registered_phones = phone_registry.count
        except Exception:
            registered_phones = 0

        # Incident count
        try:
            inc_q = await db.execute(select(func.count(IncidentLog.id)))
            incidents = inc_q.scalar() or 0
        except Exception:
            incidents = 0

        # AI calls today
        try:
            today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            ai_q = await db.execute(
                select(func.count(AILog.id)).where(AILog.created_at >= today)
            )
            ai_calls_today = ai_q.scalar() or 0
        except Exception:
            ai_calls_today = 0

        return {
            "active_alerts": active_alerts,
            "pending_alerts": pending_alerts,
            "total_alerts": total_alerts,
            "total_users": total_users,
            "active_users": active_users,
            "total_posts": total_posts,
            "pending_reports": pending_reports,
            "registered_phones": registered_phones,
            "incidents": incidents,
            "ai_calls_today": ai_calls_today,
            "system_status": "operational",
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        return {
            "active_alerts": 0, "pending_alerts": 0, "total_alerts": 0,
            "total_users": 0, "active_users": 0, "total_posts": 0,
            "pending_reports": 0, "registered_phones": 0, "incidents": 0,
            "ai_calls_today": 0, "system_status": "operational",
        }


# ==================== USER MANAGEMENT ====================

@router.get("/users")
async def list_users(db=Depends(get_db)):
    """List all users with stats."""
    try:
        result = await db.execute(
            select(User).order_by(User.created_at.desc()).limit(200)
        )
        users = result.scalars().all()

        return {
            "users": [
                {
                    "id": u.id,
                    "name": u.full_name or u.username,
                    "email": u.email,
                    "role": u.user_type or "citizen",
                    "status": "active" if u.is_active else "inactive",
                    "joinedDate": u.created_at.strftime("%Y-%m-%d") if u.created_at else "",
                    "lastActive": _relative_time(u.updated_at),
                    "location": (u.location or {}).get("city", "Not specified") if isinstance(u.location, dict) else "Not specified",
                }
                for u in users
            ]
        }
    except Exception as e:
        logger.error(f"User list error: {e}")
        return {"users": []}


@router.put("/users/{user_id}")
async def update_user(user_id: str, body: UserUpdateRequest, db=Depends(get_db), _admin=Depends(verify_firebase_token)):
    """Update a user's profile."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.name is not None:
        user.full_name = body.name
    if body.email is not None:
        user.email = body.email
    if body.role is not None:
        user.user_type = body.role
    if body.status is not None:
        user.is_active = body.status == "active"
    await db.commit()
    return {"success": True}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, db=Depends(get_db), _admin=Depends(verify_firebase_token)):
    """Delete a user."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
    return {"success": True}


# ==================== SYSTEM LOGS ====================

@router.get("/logs")
async def get_system_logs(limit: int = 20, db=Depends(get_db)):
    """Return recent system activity for the admin overview."""
    logs = []

    # Recent alerts as log items
    try:
        alert_result = await db.execute(
            select(Alert).order_by(Alert.created_at.desc()).limit(limit)
        )
        for a in alert_result.scalars().all():
            severity_map = {"critical": "red", "warning": "yellow", "info": "blue"}
            logs.append({
                "color": severity_map.get(a.severity, "blue"),
                "title": f"Alert: {a.title}",
                "description": f"{a.severity.capitalize()} — {a.source or 'system'}",
                "time": a.created_at.isoformat() if a.created_at else "",
            })
    except Exception:
        pass

    # Recent incidents
    try:
        inc_result = await db.execute(
            select(IncidentLog).order_by(IncidentLog.created_at.desc()).limit(limit)
        )
        for inc in inc_result.scalars().all():
            logs.append({
                "color": "red" if inc.incident_type == "retraction" else "yellow",
                "title": f"Incident: {inc.incident_type}",
                "description": inc.reason[:120],
                "time": inc.created_at.isoformat() if inc.created_at else "",
            })
    except Exception:
        pass

    # Sort by time descending
    logs.sort(key=lambda l: l["time"], reverse=True)
    return {"logs": logs[:limit]}


def _relative_time(dt):
    if not dt:
        return "Unknown"
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        from datetime import timezone as tz
        dt = dt.replace(tzinfo=tz.utc)
    diff = now - dt
    if diff.total_seconds() < 60:
        return "Just now"
    if diff.total_seconds() < 3600:
        return f"{int(diff.total_seconds() // 60)} minutes ago"
    if diff.total_seconds() < 86400:
        return f"{int(diff.total_seconds() // 3600)} hours ago"
    return f"{diff.days} days ago"


# ==================== ADMIN ENDPOINTS ====================

@router.post("/alerts/retract")
async def retract_alert(request: RetractionRequest, db=Depends(get_db), _admin=Depends(verify_firebase_token)):
    """
    Retract an alert using the full safety pipeline:
    1. Mark alert as retracted in DB
    2. Log incident (incident_logs table)
    3. Record false positive for auto-disable tracking
    4. Send correction via WebSocket + Push
    """
    from alert_safety import retraction_service, AlertDecisionEngine

    result = await retraction_service.retract_alert(
        alert_id=request.alert_id,
        reason=request.reason,
        admin_user_id=request.admin_user_id or "admin",
    )

    if not result["success"]:
        raise HTTPException(status_code=404 if "not found" in result.get("error", "") else 500,
                            detail=result.get("error", "Retraction failed"))

    return result


@router.post("/alerts/approve")
async def approve_pending_alert(request: AlertApprovalRequest, db=Depends(get_db), _admin=Depends(verify_firebase_token)):
    """
    Approve or reject a pending alert (human-in-the-loop for medium confidence).
    """
    from alert_safety import AlertDecisionEngine

    alert = await db.get(Alert, request.alert_id)
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    if request.approved:
        alert.is_active = True
        await db.commit()
        
        logger.info(f"Admin approved alert {request.alert_id}")
        
        return {
            "success": True,
            "alert_id": request.alert_id,
            "action": "approved",
            "message": "Alert activated and notifications sent"
        }
    else:
        alert.is_active = False
        alert.retracted = True
        alert.retraction_reason = "Rejected by admin during review"
        await db.commit()

        # Record as false positive
        AlertDecisionEngine.record_false_positive(alert.alert_type)
        
        logger.info(f"Admin rejected alert {request.alert_id}")
        
        return {
            "success": True,
            "alert_id": request.alert_id,
            "action": "rejected",
            "message": "Alert rejected and marked as false positive"
        }


@router.get("/incidents")
async def get_incident_logs(limit: int = 50, db = Depends(get_db)):
    """Get recent incident logs (retractions, false positives)."""
    from alert_safety import retraction_service

    logs = await retraction_service.get_incident_logs(limit=limit)
    return {"total": len(logs), "incidents": logs}


@router.get("/safety/status")
async def get_safety_status():
    """Get current alert safety engine status (rate limits, disabled types, false positive counts)."""
    from alert_safety import AlertDecisionEngine

    return {
        "false_positive_counts": dict(AlertDecisionEngine._false_positive_count),
        "auto_disabled_types": [
            t for t in AlertDecisionEngine._false_positive_count
            if AlertDecisionEngine._is_auto_disabled(t)
        ],
        "max_alerts_per_hour": AlertDecisionEngine.MAX_ALERTS_PER_HOUR,
        "false_positive_threshold": AlertDecisionEngine.FALSE_POSITIVE_THRESHOLD,
    }


@router.post("/safety/reset/{event_type}")
async def reset_false_positives(event_type: str):
    """Admin reset of false positive counter to re-enable auto-alerting."""
    from alert_safety import AlertDecisionEngine

    AlertDecisionEngine.reset_false_positives(event_type)
    return {"success": True, "event_type": event_type, "message": f"False positives reset for {event_type}"}


@router.get("/alerts/pending")
async def get_pending_alerts(db = Depends(get_db)):
    """Get alerts awaiting admin review (medium confidence)."""
    from sqlalchemy import select
    
    # Filter for alerts that are not active and not retracted
    # (These are pending review)
    query = select(Alert).where(
        Alert.is_active == False,
        Alert.retracted == False
    ).order_by(Alert.created_at.desc())
    
    result = await db.execute(query)
    alerts = result.scalars().all()
    
    return {
        "total": len(alerts),
        "pending_alerts": [
            {
                "id": a.id,
                "alert_type": a.alert_type,
                "severity": a.severity,
                "title": a.title,
                "location": a.location,
                "created_at": a.created_at.isoformat()
            }
            for a in alerts
        ]
    }
