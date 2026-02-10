# Testing Guide - Voice Integration

## Quick Start Testing

### 1. Backend Voice Endpoints

#### Test Transcription Endpoint
```bash
# You'll need an audio file first (record using your phone or computer)
curl -X POST http://localhost:8000/api/voice/transcribe \
  -H "Content-Type: multipart/form-data" \
  -F "audio_file=@path/to/your/audio.webm"
```

**Expected Response:**
```json
{
  "success": true,
  "text": "Your transcribed text here",
  "timestamp": "2024-01-15T10:30:00.000000"
}
```

#### Test Voice Chat Endpoint
```bash
curl -X POST http://localhost:8000/api/voice/chat \
  -H "Content-Type: multipart/form-data" \
  -F "audio_file=@path/to/your/audio.webm"
```

**Expected Response:**
```json
{
  "transcription": "What's the weather like today?",
  "response": "Today's weather is sunny with temperatures around 28°C. Perfect conditions with clear skies!",
  "timestamp": "2024-01-15T10:30:00.000000"
}
```

### 2. Frontend Voice UI

#### Manual Testing Steps

1. **Start Backend:**
```bash
cd backend
python server.py
```
Wait for: `Application startup complete.`

2. **Start Frontend:**
```bash
cd frontend
npm start
```
Wait for browser to open at `http://localhost:3000`

3. **Login and Navigate:**
   - Login (dev mode auto-logs in)
   - Go to **Dashboard** page
   - See the **Suraksha AI** chat interface at the top

4. **Test Voice Recording:**
   - Click the **microphone button** 🎤 (next to Send button)
   - Browser will ask for microphone permission - **Allow**
   - Microphone button turns **red** with pulsing dot
   - **Speak clearly**: "What's the weather like today?"
   - Click microphone button again to **stop**
   - Watch for:
     - Loading indicator
     - User message appears with transcription
     - Bot response appears
     - Text-to-speech plays the response

5. **Test Text-to-Speech:**
   - Send any text message
   - Response should auto-play via speaker
   - Click **volume icon** to mute/unmute

6. **Test Quick Prompts:**
   - Click any of the quick prompt buttons:
     - 🌧️ Weather forecast for today
     - 💨 Current air quality status
     - 🌊 What to do during floods?
     - 🏠 Emergency kit checklist
   - Quick prompt text fills input
   - Press Enter or click Send

### 3. Error Testing

#### No Microphone Permission
- **Action:** Deny microphone permission
- **Expected:** Toast error "Could not access microphone"
- **Fix:** Allow microphone in browser settings

#### Invalid Audio Format
- **Action:** Upload non-audio file  
- **Expected:** 500 error with "Voice processing failed"
- **Fix:** Use valid audio format (WebM, MP3, WAV)

#### Backend Down
- **Action:** Stop backend server
- **Expected:** Toast error "Failed to get response"
- **Fallback:** Emergency numbers displayed in message

#### Rate Limit Hit
- **Action:** Send many requests quickly
- **Expected:** Fallback responses from rate limit handler
- **Fix:** Wait a moment before retrying

### 4. Browser Console Checks

Open **DevTools** (F12) and check:

#### Network Tab
- POST to `/api/voice/chat` should return **200 OK**
- Request should show FormData with audio_file
- Response should have transcription + response

#### Console Tab
- No errors (red messages)
- Look for: "Bytez Whisper model initialized successfully"

#### Application Tab
- Check localStorage for auth tokens
- Service worker should be registered

### 5. Performance Testing

#### Measure Response Time
```javascript
// In browser console
const start = Date.now();
// Record and send voice message
// When response arrives:
console.log(`Total time: ${Date.now() - start}ms`);
```

**Expected:**
- Transcription: 1-3 seconds
- AI Response: 2-5 seconds
- Total: 3-8 seconds

#### Check Audio Quality
- Record 5-10 second message
- Verify transcription accuracy
- Aim for >90% accuracy
- Clear speech in quiet environment

### 6. Google Maps Testing

#### Check Map Loading
1. Go to **Map View** page
2. Map should load without errors
3. No "InvalidKeyMapError" in console
4. Markers should display correctly

#### Verify Configuration
```javascript
// In browser console
console.log(process.env.REACT_APP_GOOGLE_MAPS_API_KEY);
// Should show your API key, not placeholder
```

## Automated Tests (Optional)

### Backend Unit Tests
```python
# test_voice.py
import pytest
from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

def test_voice_transcribe():
    with open("test_audio.webm", "rb") as f:
        response = client.post(
            "/api/voice/transcribe",
            files={"audio_file": ("test.webm", f, "audio/webm")}
        )
    assert response.status_code == 200
    assert "text" in response.json()
    assert response.json()["success"] == True

def test_voice_chat():
    with open("test_audio.webm", "rb") as f:
        response = client.post(
            "/api/voice/chat",
            files={"audio_file": ("test.webm", f, "audio/webm")}
        )
    assert response.status_code == 200
    assert "transcription" in response.json()
    assert "response" in response.json()
```

Run tests:
```bash
cd backend
pytest test_voice.py -v
```

### Frontend Component Tests
```javascript
// EnhancedAIChatInterface.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import EnhancedAIChatInterface from './EnhancedAIChatInterface';

test('renders microphone button', () => {
  render(<EnhancedAIChatInterface />);
  const micButton = screen.getByRole('button', { name: /mic/i });
  expect(micButton).toBeInTheDocument();
});

test('displays welcome message', () => {
  render(<EnhancedAIChatInterface />);
  expect(screen.getByText(/Namaste/i)).toBeInTheDocument();
});

test('quick prompts render', () => {
  render(<EnhancedAIChatInterface />);
  expect(screen.getByText(/Weather forecast/i)).toBeInTheDocument();
});
```

## Troubleshooting

### Voice Recording Not Working

**Check 1: Microphone Permission**
```javascript
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(() => console.log('✅ Mic access granted'))
  .catch((e) => console.error('❌ Mic access denied:', e));
```

**Check 2: Browser Support**
```javascript
if ('MediaRecorder' in window) {
  console.log('✅ MediaRecorder supported');
} else {
  console.error('❌ MediaRecorder not supported');
}
```

**Check 3: HTTPS Requirement**
- Microphone only works on HTTPS or localhost
- Make sure you're on `http://localhost:3000` or HTTPS

### Transcription Errors

**Check 1: Bytez Package**
```bash
pip show bytez
# Should show version 3.0.1 or higher
```

**Check 2: API Key**
```python
import os
print(os.environ.get('BYTEZ_API_KEY'))
# Should show: 5e625acdba9835a6c0bff4dbe5825aa3
```

**Check 3: Server Logs**
```bash
# In backend directory
python server.py
# Look for: "Bytez Whisper model initialized successfully"
```

### Text-to-Speech Not Working

**Check 1: Browser Support**
```javascript
if ('speechSynthesis' in window) {
  console.log('✅ TTS supported');
  console.log('Voices:', speechSynthesis.getVoices());
} else {
  console.error('❌ TTS not supported');
}
```

**Check 2: Volume Settings**
- Check system volume is not muted
- Check browser tab is not muted
- Check in-app volume icon state

## Success Criteria

### ✅ All Tests Pass When:

1. **Microphone Button:**
   - Turns red when recording
   - Returns to normal when stopped
   - Shows toast notifications

2. **Voice Message:**
   - Uploads successfully
   - Transcription appears in chat
   - AI response appears
   - TTS plays response

3. **Error Handling:**
   - No microphone → Clear error message
   - API error → Fallback response with emergency numbers
   - Network error → User-friendly message

4. **Performance:**
   - Total response time < 10 seconds
   - No UI freezing during processing
   - Smooth animations

5. **Google Maps:**
   - Loads without errors
   - Markers display correctly
   - No deprecation warnings

## Demo Script

### Complete User Flow Demo

**Scenario:** User checks weather via voice

1. **Start:** User on Dashboard page
2. **Action:** Click microphone button 🎤
3. **Speak:** "What's the weather like today?"
4. **Stop:** Click microphone again
5. **Wait:** See loading indicator
6. **Result:** 
   - Transcription: "What's the weather like today?"
   - Response: "Today's weather is sunny with 28°C..."
   - Auto-plays via TTS

7. **Follow-up:** Click "Current air quality status" quick prompt
8. **Result:**
   - Message sent instantly
   - AI response with AQI data
   - Visual badge showing AQI value

**Total Time:** ~10-15 seconds from voice to response

---

## Next Steps After Testing

Once all tests pass:

1. **Deploy to Production:**
   - Set environment variables on Render.com
   - Update Google Maps API key
   - Monitor logs for errors

2. **User Feedback:**
   - Share with test users
   - Collect feedback on voice accuracy
   - Measure usage metrics

3. **Optimization:**
   - Tune Whisper parameters for better accuracy
   - Implement caching for common queries
   - Add voice command shortcuts

4. **Documentation:**
   - Create user guide for voice features
   - Add tooltips for first-time users
   - FAQs for common issues

---

**Happy Testing! 🎤✨**
