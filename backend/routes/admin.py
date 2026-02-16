"""
Admin API Routes for Alert Management & Retraction
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import get_db, Alert, IncidentLog
from notifications import ws_manager
import logging

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


# ==================== ADMIN ENDPOINTS ====================

@router.post("/alerts/retract")
async def retract_alert(request: RetractionRequest, db = Depends(get_db)):
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
async def approve_pending_alert(request: AlertApprovalRequest, db = Depends(get_db)):
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
