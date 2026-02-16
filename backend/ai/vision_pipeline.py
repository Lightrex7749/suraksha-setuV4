"""
Vision Pipeline
Image upload → GPT-4o Vision analysis → severity classification → alert safeguard decision.
"""
import os
import uuid
import json
import logging
from typing import Dict, Any
from pathlib import Path

from ai.openai_client import ai_client

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

VISION_SYSTEM_PROMPT = """You are a disaster image analyst for Suraksha Setu.
Analyze the image and return ONLY valid JSON with these fields:
{
  "disaster_type": "flood"|"fire"|"earthquake"|"cyclone"|"landslide"|"none",
  "severity": "low"|"medium"|"high"|"critical",
  "confidence": 0.0-1.0,
  "description": "brief description of what you see",
  "objects_detected": ["list", "of", "notable", "objects"],
  "requires_immediate_action": true|false
}
Do NOT include anything outside the JSON object."""


async def analyze_community_image(
    image_source: str,
    user_description: str = "",
) -> Dict[str, Any]:
    """
    Full vision pipeline:
    1. Call GPT-4o Vision on image
    2. Parse structured output
    3. Combine with user description
    4. Run through alert safeguards
    5. Return decision
    """
    # Step 1: Vision analysis
    prompt = VISION_SYSTEM_PROMPT
    if user_description:
        prompt += f"\n\nUser description of event: {user_description}"

    vision_result = await ai_client.analyze_image(
        image_source=image_source,
        prompt=prompt,
        detail="low",  # save tokens; use "high" for critical review
    )

    if vision_result.get("error"):
        return {"error": vision_result["error"], "decision": None}

    # Step 2: Parse JSON from response
    raw = vision_result.get("content", "")
    try:
        # Strip markdown fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0]
        analysis = json.loads(cleaned)
    except json.JSONDecodeError:
        analysis = {
            "disaster_type": "unknown",
            "severity": "low",
            "confidence": 0.3,
            "description": raw,
            "objects_detected": [],
            "requires_immediate_action": False,
        }

    # Step 3: Severity-based decision (inline safeguard)
    severity = analysis.get("severity", "low")
    confidence = analysis.get("confidence", 0.0)
    has_corroboration = bool(user_description and len(user_description) > 20)

    risk_score = {"low": 0.2, "medium": 0.5, "high": 0.75, "critical": 0.95}.get(severity, 0.3)
    should_notify = risk_score >= 0.5 and confidence >= 0.5
    requires_review = 0.3 <= risk_score < 0.75 or (not has_corroboration and risk_score >= 0.5)

    return {
        "analysis": analysis,
        "decision": {
            "should_notify": should_notify,
            "requires_review": requires_review,
            "reason": f"Severity={severity}, confidence={confidence:.2f}, corroboration={has_corroboration}",
        },
        "usage": vision_result.get("usage"),
        "error": None,
    }


def save_upload(file_bytes: bytes, extension: str = ".jpg") -> str:
    """Save uploaded bytes and return local path."""
    name = f"{uuid.uuid4().hex}{extension}"
    path = UPLOAD_DIR / name
    path.write_bytes(file_bytes)
    return str(path)
