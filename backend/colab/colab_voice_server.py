"""Colab helper service for voice inference."""
# pyright: reportMissingImports=false

import json
import os
import tempfile
from typing import Dict, Any

from fastapi import FastAPI, UploadFile, File, Form
from faster_whisper import WhisperModel
from openai import OpenAI

app = FastAPI(title="Suraksha Colab Voice Server")

# Small model gives good speed/quality on Colab GPU.
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
whisper = WhisperModel(WHISPER_MODEL, device="cuda", compute_type="float16")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
llm_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "whisper_model": WHISPER_MODEL, "llm": bool(llm_client)}


@app.post("/voice")
async def voice(
    file: UploadFile = File(...),
    role: str = Form("citizen"),
    language: str = Form(""),
    context: str = Form("{}"),
):
    raw = await file.read()
    if not raw:
        return {"error": "empty_audio", "response": None}

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp:
        temp.write(raw)
        audio_path = temp.name

    segments, info = whisper.transcribe(audio_path, language=None if not language else language[:2])
    transcript = " ".join([seg.text.strip() for seg in segments]).strip()

    if not transcript:
        return {"error": "stt_failed", "response": None, "transcript": ""}

    answer = _generate_answer(role, transcript, context)
    return {
        "transcript": transcript,
        "response": answer,
        "detected_language": (info.language if info else None) or language or "unknown",
        "usage": {"provider": "colab", "role": role},
        "error": None,
    }


def _generate_answer(role: str, transcript: str, context_json: str) -> str:
    if not llm_client:
        return f"I heard: {transcript}. Please configure OPENAI_API_KEY in Colab for richer responses."

    try:
        parsed_context = json.loads(context_json) if context_json else {}
    except Exception:
        parsed_context = {}

    system_prompt = (
        "You are a concise disaster safety assistant for India. "
        f"User role: {role}. Prioritize practical, actionable safety guidance."
    )

    response = llm_client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"Transcript: {transcript}\nContext: {json.dumps(parsed_context, ensure_ascii=True)}",
            },
        ],
        temperature=0.4,
        max_tokens=300,
    )
    return response.choices[0].message.content or "I am here to help."
