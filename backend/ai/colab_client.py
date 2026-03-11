import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)


class ColabClient:
    """Lightweight client for a Colab-hosted voice inference API."""

    def __init__(self):
        self.base_url = os.getenv("COLAB_AI_BASE_URL", "").rstrip("/")
        self.voice_path = os.getenv("COLAB_VOICE_PATH", "/voice")
        self.api_key = os.getenv("COLAB_AI_API_KEY")
        self.timeout = float(os.getenv("COLAB_TIMEOUT_SECONDS", "20"))

        if self.base_url:
            logger.info("Colab voice provider enabled: %s", self.base_url)

    @property
    def enabled(self) -> bool:
        return bool(self.base_url)

    def _headers(self) -> Dict[str, str]:
        headers: Dict[str, str] = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def process_voice(
        self,
        file_path: str,
        role: str = "citizen",
        language: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Expected Colab response shape (flexible):
        {
          "transcript": "...",
          "response": "...",
          "detected_language": "hi-IN",
          "usage": {...},
          "error": null
        }
        """
        if not self.enabled:
            return {"error": "Colab base URL not configured", "response": None}

        path = Path(file_path)
        if not path.exists():
            return {"error": "Audio file missing", "response": None}

        data = {
            "role": role,
            "language": language or "",
            "context": json.dumps(context or {}),
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                with path.open("rb") as audio_file:
                    files = {"file": (path.name, audio_file, "audio/wav")}
                    resp = await client.post(
                        f"{self.base_url}{self.voice_path}",
                        headers=self._headers(),
                        data=data,
                        files=files,
                    )

            if resp.status_code >= 400:
                return {
                    "error": f"Colab HTTP {resp.status_code}",
                    "response": None,
                }

            payload = resp.json() if resp.text else {}
            transcript = payload.get("transcript") or payload.get("text")
            answer = payload.get("response") or payload.get("answer") or payload.get("message")
            detected_language = payload.get("detected_language") or payload.get("language")

            if not answer:
                return {"error": "Colab response missing answer", "response": None}

            return {
                "transcript": transcript,
                "response": answer,
                "detected_language": detected_language or language or "unknown",
                "usage": payload.get("usage"),
                "provider": "colab",
                "error": payload.get("error"),
            }
        except Exception as exc:
            logger.warning("Colab voice provider failed: %s", exc)
            return {"error": str(exc), "response": None}


colab_client = ColabClient()
