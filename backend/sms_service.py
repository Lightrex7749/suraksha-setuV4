"""
SMS Alert Service
=================
Sends deterministic SMS alerts via Twilio to registered users.

GOLDEN RULE: SMS is sent ONLY by the deterministic engine decision.
AI never triggers SMS. AI only generates explanation text.

Thresholds (tunable):
  AUTO_NOTIFY_THRESHOLD  = 0.70  → auto SMS/push (critical)
  ADMIN_REVIEW_LOW       = 0.45  → advisory (show to admin)
  < 0.45                         → monitor only

Vision policy:
  - NEVER auto-notify from Vision alone
  - Vision confidence >= 0.85 + deterministic overlap → provisional (admin only)
  - Vision confidence [0.6, 0.85) → flag for admin review

Double-check rule:
  - High-impact notifications require 2 independent signals
"""

import logging
import os
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════
#  THRESHOLDS
# ═══════════════════════════════════════════════════════════════
AUTO_NOTIFY_THRESHOLD = 0.70
ADMIN_REVIEW_THRESHOLD_HIGH = 0.70
ADMIN_REVIEW_THRESHOLD_LOW = 0.45
VISION_AUTO_ALERT_CONF = 0.85
VISION_MANUAL_REVIEW_CONF = 0.60

# ═══════════════════════════════════════════════════════════════
#  RETRACTION MESSAGE TEMPLATE
# ═══════════════════════════════════════════════════════════════
RETRACTION_TEMPLATE = (
    "Correction from Suraksha Setu: An earlier alert about {alert_type} "
    "at {location} was incorrect. No action required. "
    "We apologise for the error."
)

ALERT_TEMPLATE = (
    "🚨 Suraksha Setu Alert: {severity} {alert_type} detected near {location}. "
    "{description} Stay safe. Call 1078 (NDMA) for help."
)


# ═══════════════════════════════════════════════════════════════
#  TWILIO SMS CLIENT
# ═══════════════════════════════════════════════════════════════
class SMSService:
    """
    Twilio-backed SMS alert service.
    Only sends when deterministic engine decides.
    """

    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
        self.from_number = os.getenv("TWILIO_FROM_NUMBER", "")
        self._client = None
        self._available = False
        self._init_client()

    def _init_client(self):
        if self.account_sid and self.auth_token and self.from_number:
            try:
                from twilio.rest import Client
                self._client = Client(self.account_sid, self.auth_token)
                self._available = True
                logger.info("✅ Twilio SMS service initialized")
            except ImportError:
                logger.warning("⚠️  twilio package not installed — SMS disabled. Run: pip install twilio")
            except Exception as e:
                logger.warning(f"⚠️  Twilio init failed: {e}")
        else:
            logger.info("ℹ️  Twilio not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)")

    @property
    def is_available(self) -> bool:
        return self._available

    async def send_sms(self, to_number: str, message: str) -> Dict[str, Any]:
        """
        Send a single SMS. Returns result dict.
        """
        if not self._available:
            logger.info(f"[SMS-MOCK] To: {to_number} | Msg: {message[:80]}...")
            return {"success": True, "mock": True, "to": to_number, "sid": "mock"}

        try:
            msg = self._client.messages.create(
                body=message[:1600],  # Twilio limit
                from_=self.from_number,
                to=to_number,
            )
            logger.info(f"✅ SMS sent to {to_number}: SID={msg.sid}")
            return {"success": True, "mock": False, "to": to_number, "sid": msg.sid}
        except Exception as e:
            logger.error(f"❌ SMS failed to {to_number}: {e}")
            return {"success": False, "error": str(e), "to": to_number}

    async def send_alert_sms(
        self,
        phone_numbers: List[str],
        alert_type: str,
        severity: str,
        location: str,
        description: str,
    ) -> Dict[str, Any]:
        """
        Send alert SMS to multiple registered numbers.
        """
        message = ALERT_TEMPLATE.format(
            severity=severity.upper(),
            alert_type=alert_type,
            location=location,
            description=description[:200],
        )

        results = []
        for phone in phone_numbers:
            result = await self.send_sms(phone, message)
            results.append(result)

        sent = sum(1 for r in results if r.get("success"))
        logger.info(f"Alert SMS batch: {sent}/{len(phone_numbers)} delivered for {alert_type}")

        return {
            "total": len(phone_numbers),
            "sent": sent,
            "failed": len(phone_numbers) - sent,
            "results": results,
        }

    async def send_retraction_sms(
        self,
        phone_numbers: List[str],
        alert_type: str,
        location: str,
    ) -> Dict[str, Any]:
        """
        Send correction SMS when an alert is retracted.
        Uses pre-defined template for immediate dispatch.
        """
        message = RETRACTION_TEMPLATE.format(
            alert_type=alert_type,
            location=location,
        )

        results = []
        for phone in phone_numbers:
            result = await self.send_sms(phone, message)
            results.append(result)

        sent = sum(1 for r in results if r.get("success"))
        logger.info(f"Retraction SMS batch: {sent}/{len(phone_numbers)} delivered")

        return {"total": len(phone_numbers), "sent": sent, "results": results}


# ═══════════════════════════════════════════════════════════════
#  REGISTERED PHONE STORE (in-memory + DB sync)
# ═══════════════════════════════════════════════════════════════
class PhoneRegistry:
    """
    Maintains registered phone numbers for SMS alerts.
    Syncs with DB (users table) and Firestore.
    """

    def __init__(self):
        self._phones: Dict[str, Dict[str, Any]] = {}
        # uid -> {phone, email, name, sms_enabled, location}

    def register(self, uid: str, phone: str, email: str = "", name: str = "", location: Dict = None):
        self._phones[uid] = {
            "phone": phone,
            "email": email,
            "name": name,
            "sms_enabled": True,
            "location": location or {},
            "registered_at": datetime.now(timezone.utc).isoformat(),
        }
        logger.info(f"Phone registered: {phone[:6]}*** for user {uid[:8]}...")

    def unregister(self, uid: str):
        self._phones.pop(uid, None)

    def get_all_phones(self) -> List[str]:
        """Get all SMS-enabled phone numbers."""
        return [
            v["phone"] for v in self._phones.values()
            if v.get("sms_enabled") and v.get("phone")
        ]

    def get_phones_near(self, lat: float, lon: float, radius_km: float = 50) -> List[str]:
        """Get phones of users near a location (for targeted alerts)."""
        from utils.geo import haversine

        phones = []
        for v in self._phones.values():
            if not v.get("sms_enabled") or not v.get("phone"):
                continue
            loc = v.get("location", {})
            u_lat = loc.get("lat")
            u_lon = loc.get("lon")
            if u_lat is not None and u_lon is not None:
                dist = haversine(lat, lon, u_lat, u_lon)
                if dist <= radius_km:
                    phones.append(v["phone"])
            else:
                # No location → include in broad alerts
                phones.append(v["phone"])
        return phones

    @property
    def count(self) -> int:
        return len(self._phones)


# ═══════════════════════════════════════════════════════════════
#  ALERT NOTIFICATION DISPATCHER
# ═══════════════════════════════════════════════════════════════
class AlertNotificationDispatcher:
    """
    Central dispatcher that decides WHAT notification channel to use
    based on deterministic decision engine output.

    Decision flow:
      risk_score >= 0.70 → auto SMS + push + WebSocket
      risk_score [0.45, 0.70) → admin_review (internal only)
      risk_score < 0.45 → monitor (no notification)

    Double-check rule:
      For auto-SMS, require either:
        - 2+ independent data sources, OR
        - risk_score >= 0.85 (overwhelming single source)
    """

    def __init__(self, sms_service: SMSService, phone_registry: PhoneRegistry):
        self.sms = sms_service
        self.phones = phone_registry
        self._sms_log: List[Dict] = []  # Audit trail

    async def dispatch(
        self,
        decision: Dict[str, Any],
        alert_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Dispatch notifications based on deterministic decision.

        Args:
            decision: Output from AlertDecisionEngine.evaluate_event()
            alert_data: {alert_type, severity, title, description, location}
        """
        action = decision.get("action", "dismiss")
        risk_score = decision.get("risk_score", 0)
        cross_sources = decision.get("cross_sources", [])

        result = {
            "action": action,
            "sms_sent": False,
            "push_sent": False,
            "ws_sent": False,
            "admin_notified": False,
        }

        if action == "auto_alert" and decision.get("should_notify"):
            # Double-check rule: require 2+ sources OR overwhelming score
            num_sources = len(cross_sources)
            if num_sources >= 2 or risk_score >= 0.85:
                # SEND SMS
                location_str = alert_data.get("location_name", "your area")
                lat = alert_data.get("lat")
                lon = alert_data.get("lon")

                # Get targeted phone numbers
                if lat and lon:
                    phones = self.phones.get_phones_near(lat, lon, radius_km=100)
                else:
                    phones = self.phones.get_all_phones()

                if phones:
                    sms_result = await self.sms.send_alert_sms(
                        phone_numbers=phones,
                        alert_type=alert_data.get("alert_type", "disaster"),
                        severity=alert_data.get("severity", "high"),
                        location=location_str,
                        description=alert_data.get("description", ""),
                    )
                    result["sms_sent"] = True
                    result["sms_details"] = sms_result

                    # Audit log
                    self._sms_log.append({
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "type": "alert",
                        "alert_type": alert_data.get("alert_type"),
                        "risk_score": risk_score,
                        "phones_count": len(phones),
                        "sent": sms_result.get("sent", 0),
                    })

                # WebSocket broadcast
                try:
                    from notifications import ws_manager, push_manager
                    await ws_manager.broadcast({
                        "type": "new_alert",
                        "alert": alert_data,
                        "risk_score": risk_score,
                    })
                    result["ws_sent"] = True

                    await push_manager.broadcast_notification({
                        "title": f"🚨 {alert_data.get('severity', 'HIGH').upper()} Alert",
                        "body": alert_data.get("description", ""),
                    })
                    result["push_sent"] = True
                except Exception as e:
                    logger.warning(f"WS/Push dispatch error: {e}")

            else:
                # Single source, moderate score → escalate to admin review
                result["action"] = "admin_review_escalated"
                result["reason"] = f"Double-check failed: only {num_sources} source(s)"
                result["admin_notified"] = True
                logger.info(f"Double-check: single source with score {risk_score:.2f} → admin review")

        elif action == "admin_review":
            result["admin_notified"] = True
            logger.info(f"Admin review flagged: {alert_data.get('alert_type')} score={risk_score:.2f}")

        return result

    async def dispatch_retraction(
        self,
        alert_type: str,
        location: str,
        lat: float = None,
        lon: float = None,
    ) -> Dict[str, Any]:
        """
        Send retraction SMS to all affected users.
        """
        if lat and lon:
            phones = self.phones.get_phones_near(lat, lon, radius_km=100)
        else:
            phones = self.phones.get_all_phones()

        if phones:
            sms_result = await self.sms.send_retraction_sms(
                phone_numbers=phones,
                alert_type=alert_type,
                location=location,
            )

            self._sms_log.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "retraction",
                "alert_type": alert_type,
                "phones_count": len(phones),
                "sent": sms_result.get("sent", 0),
            })

            return {"retraction_sms_sent": True, "details": sms_result}

        return {"retraction_sms_sent": False, "reason": "no registered phones"}

    def get_sms_audit_log(self, limit: int = 50) -> List[Dict]:
        return self._sms_log[-limit:]


# ═══════════════════════════════════════════════════════════════
#  SINGLETONS
# ═══════════════════════════════════════════════════════════════
sms_service = SMSService()
phone_registry = PhoneRegistry()
alert_dispatcher = AlertNotificationDispatcher(sms_service, phone_registry)
