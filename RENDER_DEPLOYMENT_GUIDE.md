# 🚀 Render Deployment Guide - Suraksha Setu

## Quick Start - Deploy Backend to Render

### ✅ Prerequisites
- [x] GitHub repository (already set up)
- [x] PostgreSQL database on Render (already created: `databse_0f95`)
- [ ] Render account (create at https://render.com)

---

## 📋 Step-by-Step Backend Deployment

### 1️⃣ **Connect GitHub to Render**
1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account
4. Select repository: `Lightrex7749/Suraksha-Setu`
5. Click **"Connect"**

### 2️⃣ **Configure Backend Service**
```yaml
Name: suraksha-setu-backend
Region: Oregon (US West)
Branch: main
Root Directory: backend
Runtime: Python 3
Build Command: pip install -r requirements.txt
Start Command: python server.py
Instance Type: Free
```

### 3️⃣ **Add Environment Variables**
Click **"Advanced"** → **"Add Environment Variable"** and add these:

#### 🔗 **Database (Auto-detected)**
- `DATABASE_URL` → **Link to existing database: `databse_0f95`**
- `POSTGRES_URL` → **Same as DATABASE_URL**
- `DB_NAME`: `suraksha_setu`

#### 🤖 **AI & API Keys** (Add Manually)
```bash
OPENAI_API_KEY=sk-proj-***YOUR_KEY*** 
GEMINI_API_KEY=***YOUR_KEY***
OPENWEATHER_API_KEY=***YOUR_KEY***
WAQI_API_KEY=***YOUR_KEY***
```

#### 🔐 **Security** (Auto-generate)
- `SECRET_KEY` → Click **"Generate"**
- `JWT_SECRET` → Click **"Generate"**
- `ACCESS_TOKEN_EXPIRE_MINUTES`: `10080`

#### 🔥 **Firebase**
```bash
FIREBASE_PROJECT_ID=surakhsa-setu
```

#### ⚙️ **Server Config**
```bash
PORT=8000
CORS_ORIGINS=*
ENABLE_AI_INSIGHTS=true
ENABLE_REAL_TIME_DATA=true
```

### 4️⃣ **Deploy**
1. Click **"Create Web Service"**
2. Wait for build (5-10 minutes)
3. ✅ Backend will be live at: `https://suraksha-setu-backend.onrender.com`

---

## 🌐 Frontend Deployment (Optional - Static Site)

### Option A: Deploy to Render
1. **New +** → **Static Site**
2. Select same repository
3. Configure:
   ```yaml
   Name: suraksha-setu-frontend
   Root Directory: frontend
   Build Command: npm install && npm run build
   Publish Directory: build
   ```
4. Add environment variable:
   ```bash
   REACT_APP_BACKEND_URL=https://suraksha-setu-backend.onrender.com
   ```

### Option B: Deploy to Firebase Hosting (Already configured)
```bash
cd frontend
npm install
npm run build
firebase deploy --only hosting
```

---

## 🔍 Verify Deployment

### Test Backend Health
```bash
curl https://suraksha-setu-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-02-10T..."
}
```

### Test WebSocket Connection
Open browser console on frontend:
```javascript
const ws = new WebSocket('wss://suraksha-setu-backend.onrender.com/api/ws/alerts');
ws.onopen = () => console.log('✅ WebSocket connected');
```

---

## 🔧 Post-Deployment Configuration

### 1. **Update Frontend Environment**
After backend is deployed, update frontend `.env.production`:
```bash
REACT_APP_BACKEND_URL=https://suraksha-setu-backend.onrender.com
```

### 2. **Whitelist Backend IP on Database**
Your backend on Render can connect to the database automatically (no IP whitelist needed for Render-to-Render connections).

### 3. **Update CORS Origins** (Production)
Once frontend is deployed, update backend env:
```bash
CORS_ORIGINS=https://your-frontend-url.web.app,https://suraksha-setu-frontend.onrender.com
```

---

## 📊 Database Access from Render

### Check Database Tables
Once backend is deployed on Render, it will auto-create tables on first run.

To manually check tables:
```bash
# From Render Shell (Dashboard → Backend Service → Shell)
python check_database.py
```

Or using Render CLI:
```bash
render shell suraksha-setu-backend
python check_database.py
```

---

## 🐛 Troubleshooting

### ❌ Build Fails
**Check:**
- Python version in `runtime.txt` (should be `python-3.11` or `python-3.12`)
- All dependencies in `requirements.txt`
- Build logs in Render dashboard

**Fix:**
```bash
# Add to backend/runtime.txt
python-3.11.0
```

### ❌ Database Connection Fails
**Check:**
- Database is linked in environment variables
- `DATABASE_URL` starts with `postgresql://` (not `postgresql+asyncpg://` in env var)
- Database is not paused

### ❌ WebSocket Not Working
**Check:**
- Backend URL uses `wss://` (not `ws://`) for production
- CORS_ORIGINS includes frontend domain
- Frontend WebSocket endpoint matches backend URL

---

## 💰 Cost Estimate

### Free Tier (Current Setup)
- ✅ Backend: Free (750 hrs/month)
- ✅ PostgreSQL: Free (1GB storage, 1 million rows)
- ✅ Frontend (Static): Free (100GB bandwidth)

**Total: $0/month** 🎉

### Upgrade Triggers
- Database > 1GB → $7/month (Starter plan)
- Backend needs more uptime → $7/month (Starter plan)
- Need custom domain → Free (included)

---

## 🔗 Important URLs

After deployment, save these:

```
Backend API: https://suraksha-setu-backend.onrender.com
Backend Docs: https://suraksha-setu-backend.onrender.com/docs
Frontend: https://your-chosen-domain.onrender.com
Database: dpg-d5uq87vfte5s73c80j5g-a.oregon-postgres.render.com

Render Dashboard: https://dashboard.render.com
GitHub Repo: https://github.com/Lightrex7749/Suraksha-Setu
```

---

## 🎯 Next Steps After Deployment

1. ✅ Test all API endpoints
2. ✅ Verify WebSocket connections
3. ✅ Check database tables created
4. ✅ Test alerts system
5. ✅ Update frontend to use production backend URL
6. ✅ Enable HTTPS (automatic on Render)
7. ✅ Set up custom domain (optional)
8. ✅ Configure CORS properly
9. ✅ Test AI chatbot
10. ✅ Monitor logs in Render dashboard

---

## 📞 Support

**Render Docs:** https://render.com/docs
**SQLAlchemy + Render:** https://render.com/docs/deploy-fastapi
**WebSocket on Render:** https://render.com/docs/websockets

**Your Current Setup:**
- Database: `databse_0f95` (Oregon)
- GitHub: Lightrex7749/Suraksha-Setu
- Branch: main
- Framework: FastAPI + React

---

**Last Updated:** February 10, 2026
