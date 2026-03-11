# Colab Voice Acceleration (Test Mode)

This project now supports a Colab-first voice path for `POST /api/ai/voice`.

Ready helper files are included:

- `backend/colab/colab_voice_server.py`
- `backend/colab/requirements_colab.txt`

## 1) Configure backend environment

Add these variables in `backend/.env`:

```env
COLAB_AI_BASE_URL=https://<your-colab-tunnel-domain>
COLAB_VOICE_PATH=/voice
COLAB_AI_API_KEY=
COLAB_TIMEOUT_SECONDS=20
```

Notes:

- `COLAB_AI_BASE_URL` should be the public URL from ngrok/cloudflared (no trailing slash).
- Keep `COLAB_AI_API_KEY` empty unless your Colab endpoint checks bearer auth.

## 2) Launch in Google Colab

In a Colab notebook (GPU runtime):

```bash
!pip install -r /content/requirements_colab.txt
```

Upload and run `colab_voice_server.py`, then start it:

```bash
!uvicorn colab_voice_server:app --host 0.0.0.0 --port 7860
```

Expose it publicly using ngrok or cloudflared and copy the public base URL into `COLAB_AI_BASE_URL`.

## 3) Colab endpoint contract

Your Colab API should accept multipart upload with:

- `file`: audio file
- `role`: citizen|student|scientist|admin
- `language`: optional language code (for example `hi-IN`)
- `context`: JSON string

And return JSON:

```json
{
  "transcript": "...",
  "response": "...",
  "detected_language": "hi-IN",
  "usage": {"provider": "colab"},
  "error": null
}
```

## 4) Fallback behavior

If Colab fails or times out, backend automatically falls back to:

1. Sarvam STT + local orchestrator
2. OpenAI Whisper STT + local orchestrator

No frontend changes are required.

## 5) Quick local test

From `backend/`:

```bash
python -c "import httpx; files={'file':('test.wav', b'fake-audio', 'audio/wav')}; r=httpx.post('http://localhost:8000/api/ai/voice?role=citizen&language=hi-IN', files=files, timeout=40.0); print(r.status_code); print(r.text[:300])"
```

If Colab is reachable, responses will come from Colab first.
