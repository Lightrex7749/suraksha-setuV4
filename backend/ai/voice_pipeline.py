"""
Voice Pipeline
Audio upload → optional FFmpeg normalisation → Whisper → orchestrator → response.
"""
import os
import uuid
import shutil
import asyncio
import logging
from typing import Dict, Any
from pathlib import Path

from ai.openai_client import ai_client

logger = logging.getLogger(__name__)

TEMP_AUDIO_DIR = Path(os.getenv("TEMP_AUDIO_DIR", "./temp_audio"))
TEMP_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

FFMPEG_AVAILABLE = shutil.which("ffmpeg") is not None


async def _normalize_audio(input_path: str) -> str:
    """Normalize audio to mono 16 kHz WAV via FFmpeg (if available)."""
    if not FFMPEG_AVAILABLE:
        logger.warning("FFmpeg not found – skipping normalisation")
        return input_path

    output_path = str(Path(input_path).with_suffix(".norm.wav"))
    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-ar", "16000", "-ac", "1",
        "-acodec", "pcm_s16le",
        output_path,
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL
    )
    await proc.wait()
    if proc.returncode == 0 and os.path.exists(output_path):
        return output_path
    logger.warning("FFmpeg normalisation failed – using raw file")
    return input_path


async def process_voice_query(
    audio_bytes: bytes,
    filename: str = "voice.wav",
    role: str = "citizen",
    context: dict = None,
    language: str = None,
) -> Dict[str, Any]:
    """
    Full voice pipeline:
    1. Save temp file
    2. Normalise with FFmpeg
    3. Whisper transcription
    4. Route transcript through AI orchestrator
    5. Optionally generate TTS reply
    6. Cleanup temp files
    """
    # 1. Save
    ext = Path(filename).suffix or ".wav"
    temp_path = str(TEMP_AUDIO_DIR / f"{uuid.uuid4().hex}{ext}")
    with open(temp_path, "wb") as f:
        f.write(audio_bytes)

    try:
        # 2. Normalise
        normalised = await _normalize_audio(temp_path)

        # 3. Transcribe
        transcript_result = await ai_client.transcribe_audio(normalised, language=language)
        if transcript_result.get("error"):
            return {
                "error": transcript_result["error"],
                "transcript": None,
                "response": None,
            }

        transcript = transcript_result["text"]
        logger.info(f"🎤 Transcript: {transcript[:120]}...")

        # 4. Route to orchestrator
        from ai.orchestrator import orchestrator

        ai_response = await orchestrator.route_request(role, transcript, context)

        return {
            "transcript": transcript,
            "response": ai_response.get("message", ""),
            "usage": ai_response.get("usage"),
            "error": None,
        }
    finally:
        # 6. Cleanup
        for p in (temp_path, temp_path.replace(ext, ".norm.wav")):
            try:
                if os.path.exists(p):
                    os.remove(p)
            except OSError:
                pass
