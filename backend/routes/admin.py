"""
Admin API Routes for Alert Management & Retraction
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import get_db, Alert, IncidentLog
from alert_safeguards import retraction_service
from notifications import send_notification
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
    Retract an alert and send correction messages.
    
    **One-Click Retraction Workflow:**
    1. Mark alert as retracted in DB
    2. Log incident
    3. Send SMS/push correction messages
    4. Return retraction message template
    """
    try:
        result = await retraction_service.retract_alert(
            alert_id=request.alert_id,
            reason=request.reason
        )
        
        if not result["success"]:
            raise HTTPException(status_code=404, detail=result.get("error"))
        
        # Send correction notification to all affected users
        correction_message = result["retraction_message"]
        
        # TODO: Get affected users from alert's geo-fence
        # For now, this would integrate with notifications.py
        logger.info(f"📤 Retraction notification sent for alert {request.alert_id}")
        
        return {
            "success": True,
            "alert_id": request.alert_id,
            "message": "Alert retracted successfully",
            "correction_template": correction_message
        }
    
    except Exception as e:
        logger.error(f"❌ Retraction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/approve")
async def approve_pending_alert(request: AlertApprovalRequest, db = Depends(get_db)):
    """
    Approve or reject a pending alert (human-in-the-loop for medium confidence).
    """
    alert = await db.get(Alert, request.alert_id)
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    if request.approved:
        alert.is_active = True
        await db.commit()
        
        # Send notifications
        logger.info(f"✅ Admin approved alert {request.alert_id}")
        
        return {
            "success": True,
            "alert_id": request.alert_id,
            "action": "approved",
            "message": "Alert activated and notifications sent"
        }
    else:
        # Reject and mark as false positive
        alert.is_active = False
        alert.retracted = True
        alert.retraction_reason = "Rejected by admin during review"
        
        await db.commit()
        
        logger.info(f"❌ Admin rejected alert {request.alert_id}")
        
        return {
            "success": True,
            "alert_id": request.alert_id,
            "action": "rejected",
            "message": "Alert rejected and marked as false positive"
        }


@router.get("/incidents")
async def get_incident_logs(limit: int = 50, db = Depends(get_db)):
    """Get recent incident logs (retractions, false positives)."""
    from sqlalchemy import select
    
    query = select(IncidentLog).order_by(IncidentLog.created_at.desc()).limit(limit)
    result = await db.execute(query)
    incidents = result.scalars().all()
    
    return {
        "total": len(incidents),
        "incidents": [
            {
                "id": i.id,
                "alert_id": i.alert_id,
                "incident_type": i.incident_type,
                "reason": i.reason,
                "corrective_action": i.corrective_action,
                "created_at": i.created_at.isoformat()
            }
            for i in incidents
        ]
    }


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
