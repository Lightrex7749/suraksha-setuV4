
import os
import io
import logging
import hashlib
import json
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

from openai import AsyncOpenAI, APIError, RateLimitError
from utils.redis_client import redis_client

logger = logging.getLogger(__name__)

# ─── Configuration ──────────────────────────────────────────
MODEL_MINI = os.getenv("OPENAI_MODEL_MINI", "gpt-4o-mini")
MODEL_HEAVY = os.getenv("OPENAI_MODEL_HEAVY", "gpt-4o")
EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
MAX_TOKENS_PER_REQ = int(os.getenv("OPENAI_MAX_TOKENS_PER_REQUEST", "1000"))
TOTAL_TOKEN_LIMIT = int(os.getenv("OPENAI_TOTAL_TOKEN_LIMIT", "500000"))
REDIS_TOKEN_KEY = "openai:total_tokens_used"


class OpenAIClient:
    """
    Unified OpenAI wrapper with:
    - Chat completions (mini & heavy models)
    - Function Calling with structured JSON
    - Whisper speech-to-text
    - GPT-4o Vision image analysis
    - text-embedding-3-small embeddings
    - TTS text-to-speech
    - Redis caching + token budget enforcement
    """

    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key or self.api_key.startswith("mock"):
            logger.warning("⚠️  OPENAI_API_KEY not set or mock. AI features will fail.")
            self.client = None
        else:
            self.client = AsyncOpenAI(api_key=self.api_key)
            logger.info("✅ OpenAI Client Initialized")

    # ═══════════════════════════════════════════════════════════
    #  TOKEN BUDGET
    # ═══════════════════════════════════════════════════════════
    async def _check_budget(self, estimated_tokens: int = 500) -> bool:
        """Check if we have enough budget remaining."""
        try:
            r = await redis_client.get_client()
            if r:
                used = int(await r.get(REDIS_TOKEN_KEY) or 0)
                if used + estimated_tokens > TOTAL_TOKEN_LIMIT:
                    logger.error(f"🚨 TOKEN BUDGET EXCEEDED: {used}/{TOTAL_TOKEN_LIMIT}")
                    return False
                return True
        except Exception:
            pass
        return True  # allow if Redis is down

    async def _record_usage(self, tokens: int, model: str, endpoint: str,
                            user_id: str = None, cached: bool = False):
        """Increment Redis counter and log to DB."""
        try:
            r = await redis_client.get_client()
            if r:
                await r.incrby(REDIS_TOKEN_KEY, tokens)
        except Exception:
            pass
        # DB logging handled by caller or orchestrator
        logger.info(f"📊 Tokens: +{tokens} | model={model} | endpoint={endpoint}")

    # ═══════════════════════════════════════════════════════════
    #  CHAT COMPLETIONS (mini / heavy)
    # ═══════════════════════════════════════════════════════════
    async def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str = None,
        max_tokens: int = None,
        temperature: float = 0.7,
        tools: List[Dict] = None,
        json_mode: bool = False,
        use_heavy: bool = False,
    ) -> Dict[str, Any]:
        """
        Core chat completion.
        - model defaults to MODEL_MINI or MODEL_HEAVY when use_heavy=True
        - max_tokens capped by MAX_TOKENS_PER_REQ
        """
        if not self.client:
            return {"error": "OpenAI client not initialized", "content": None}

        model = model or (MODEL_HEAVY if use_heavy else MODEL_MINI)
        max_tokens = min(max_tokens or MAX_TOKENS_PER_REQ, MAX_TOKENS_PER_REQ)

        # Budget check
        if not await self._check_budget(max_tokens):
            return {"error": "Token budget exceeded", "content": None}

        # Cache check
        cache_key = self._cache_key(system_prompt, user_prompt, model)
        cached = await self._cache_get(cache_key)
        if cached:
            return cached

        try:
            kwargs: Dict[str, Any] = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            if tools:
                kwargs["tools"] = tools
                kwargs["tool_choice"] = "auto"
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            response = await self.client.chat.completions.create(**kwargs)
            msg = response.choices[0].message
            usage = response.usage

            result = {
                "content": msg.content,
                "tool_calls": [
                    {"id": tc.id, "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                    for tc in (msg.tool_calls or [])
                ] or None,
                "usage": {
                    "prompt": usage.prompt_tokens,
                    "completion": usage.completion_tokens,
                    "total": usage.total_tokens,
                },
                "model": model,
                "error": None,
            }

            await self._record_usage(usage.total_tokens, model, "chat")
            if not result["tool_calls"]:
                await self._cache_set(cache_key, result)
            return result

        except RateLimitError:
            logger.error("🚫 OpenAI rate-limit hit")
            return {"error": "Rate limit exceeded. Please try again shortly.", "content": None}
        except APIError as e:
            logger.error(f"OpenAI API error: {e}")
            return {"error": str(e), "content": None}
        except Exception as e:
            logger.error(f"Unexpected OpenAI error: {e}")
            return {"error": "Internal AI error", "content": None}

    # back-compat alias
    async def chat_completion(self, system_prompt, user_prompt, **kw):
        return await self.chat(system_prompt, user_prompt, **kw)

    # ═══════════════════════════════════════════════════════════
    #  FUNCTION CALLING  (structured JSON output)
    # ═══════════════════════════════════════════════════════════
    async def chat_with_functions(
        self,
        system_prompt: str,
        user_prompt: str,
        functions: List[Dict],
        model: str = None,
    ) -> Dict[str, Any]:
        """Chat with explicit function schemas for structured output."""
        tools = [{"type": "function", "function": f} for f in functions]
        return await self.chat(system_prompt, user_prompt, model=model, tools=tools)

    # ═══════════════════════════════════════════════════════════
    #  WHISPER  (speech → text)
    # ═══════════════════════════════════════════════════════════
    async def transcribe_audio(
        self, file_path: str, language: str = None
    ) -> Dict[str, Any]:
        """
        Transcribe audio via Whisper.
        Returns: {text, language, duration, error}
        """
        if not self.client:
            return {"error": "Client not initialized", "text": None}
        if not await self._check_budget(500):
            return {"error": "Token budget exceeded", "text": None}
        try:
            with open(file_path, "rb") as f:
                kwargs: Dict[str, Any] = {
                    "model": "whisper-1",
                    "file": f,
                    "response_format": "text",
                    "prompt": "Disaster safety, weather, earthquake, cyclone, flood, India.",
                }
                if language:
                    kwargs["language"] = language
                transcript = await self.client.audio.transcriptions.create(**kwargs)
            await self._record_usage(500, "whisper-1", "whisper")
            text = transcript if isinstance(transcript, str) else transcript.text
            return {"text": text, "error": None}
        except Exception as e:
            logger.error(f"Whisper error: {e}")
            return {"error": str(e), "text": None}

    # ═══════════════════════════════════════════════════════════
    #  VISION  (image analysis)
    # ═══════════════════════════════════════════════════════════
    async def analyze_image(
        self,
        image_source: str,
        prompt: str = "Analyze this image for disaster-related content. Identify disaster type, severity, and notable features.",
        detail: str = "low",
    ) -> Dict[str, Any]:
        """
        Analyse an image using GPT-4o Vision.
        image_source: URL or base64 data URI
        """
        if not self.client:
            return {"error": "Client not initialized", "content": None}
        if not await self._check_budget(800):
            return {"error": "Token budget exceeded", "content": None}
        try:
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_source, "detail": detail}},
                    ],
                }
            ]
            response = await self.client.chat.completions.create(
                model=MODEL_HEAVY, messages=messages, max_tokens=500
            )
            usage = response.usage
            await self._record_usage(usage.total_tokens, MODEL_HEAVY, "vision")
            return {
                "content": response.choices[0].message.content,
                "usage": {"total": usage.total_tokens},
                "error": None,
            }
        except Exception as e:
            logger.error(f"Vision error: {e}")
            return {"error": str(e), "content": None}

    # ═══════════════════════════════════════════════════════════
    #  EMBEDDINGS
    # ═══════════════════════════════════════════════════════════
    async def get_embeddings(
        self, texts: List[str]
    ) -> Dict[str, Any]:
        """
        Generate embeddings using text-embedding-3-small.
        Returns: {embeddings: [[float,...]], usage, error}
        """
        if not self.client:
            return {"error": "Client not initialized", "embeddings": None}
        if not await self._check_budget(len(texts) * 50):
            return {"error": "Token budget exceeded", "embeddings": None}
        try:
            response = await self.client.embeddings.create(
                model=EMBEDDING_MODEL, input=texts
            )
            vecs = [d.embedding for d in response.data]
            total = response.usage.total_tokens
            await self._record_usage(total, EMBEDDING_MODEL, "embeddings")
            return {"embeddings": vecs, "usage": {"total": total}, "error": None}
        except Exception as e:
            logger.error(f"Embeddings error: {e}")
            return {"error": str(e), "embeddings": None}

    # ═══════════════════════════════════════════════════════════
    #  TEXT-TO-SPEECH (optional)
    # ═══════════════════════════════════════════════════════════
    async def text_to_speech(
        self, text: str, voice: str = "alloy", speed: float = 1.0
    ) -> Dict[str, Any]:
        """
        Convert text to speech using OpenAI TTS.
        Returns: {audio_bytes, error}
        """
        if not self.client:
            return {"error": "Client not initialized", "audio_bytes": None}
        try:
            response = await self.client.audio.speech.create(
                model="tts-1", voice=voice, input=text, speed=speed
            )
            audio = response.read()
            await self._record_usage(len(text), "tts-1", "tts")
            return {"audio_bytes": audio, "error": None}
        except Exception as e:
            logger.error(f"TTS error: {e}")
            return {"error": str(e), "audio_bytes": None}

    # ═══════════════════════════════════════════════════════════
    #  CACHE HELPERS
    # ═══════════════════════════════════════════════════════════
    @staticmethod
    def _cache_key(system: str, user: str, model: str) -> str:
        raw = f"{model}:{system}:{user}"
        return f"ai_cache:{hashlib.sha256(raw.encode()).hexdigest()}"

    async def _cache_get(self, key: str) -> Optional[Dict]:
        try:
            r = await redis_client.get_client()
            if r:
                data = await r.get(key)
                if data:
                    logger.info("✅ AI Cache HIT")
                    return json.loads(data)
        except Exception:
            pass
        return None

    async def _cache_set(self, key: str, data: Dict, ttl: int = 3600):
        try:
            r = await redis_client.get_client()
            if r:
                await r.setex(key, ttl, json.dumps(data, default=str))
        except Exception:
            pass


# ── Singleton ──────────────────────────────────────────────
ai_client = OpenAIClient()
