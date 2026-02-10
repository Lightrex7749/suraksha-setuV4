# 🔧 Local Development Setup

## ✅ **Backend is Now Running with SQLite!**

I've switched your backend to use **SQLite** instead of PostgreSQL for local development.

---

## 🎯 **What Changed:**

### ✅ **Added SQLite Support**
- Installed `aiosqlite` for async SQLite connections
- Database file: `backend/suraksha_setu.db` (auto-created)
- No more connection timeout errors!

### ✅ **Smart Database Detection**
Your [database.py](backend/database.py#L12-L54) now auto-detects:
- **SQLite** → Local development
- **PostgreSQL** → Production (Render)

### ✅ **Configuration Files**
- `backend/.env` → Currently using SQLite (local)
- `backend/.env.local` → SQLite template
- `backend/.env.production` → PostgreSQL for Render

---

## 🚀 **Your Backend is Running!**

**Status:** ✅ Running in background on port 8000

**Test it:**
```powershell
# Check server health
curl http://localhost:8000/health

# Open API docs
start http://localhost:8000/docs
```

---

## 📊 **Database Tables Auto-Created:**

Your SQLite database now has all 8 tables:
1. ✅ `users`
2. ✅ `chat_messages`
3. ✅ `alerts`
4. ✅ `community_reports`
5. ✅ `status_checks`
6. ✅ `push_subscriptions`
7. ✅ `community_posts`
8. ✅ `comments`

**View database:**
```powershell
# Install SQLite browser (optional)
choco install sqlite

# Or use Python to inspect
cd backend
python check_database.py
```

---

## 🔄 **Switch Between Databases:**

### Local Development (SQLite)
```powershell
cd backend
# Windows
.\use-local-db.bat

# Or manually
Copy-Item .env.local .env
python server.py
```

### Production Testing (PostgreSQL)
```powershell
cd backend
Copy-Item .env.production .env
# This will fail locally (IP restriction)
# Deploy to Render for production database
```

---

## ✅ **Frontend Should Now Work!**

Refresh your frontend - these errors should be **GONE**:
- ❌ `WebSocket connection failed`
- ❌ `POST http://localhost:8000/api/chat net::ERR_FAILED`
- ❌ `Network Error`

**What now works:**
- ✅ WebSocket alerts at `ws://localhost:8000/api/ws/alerts`
- ✅ AI chatbot at `http://localhost:8000/api/chat`
- ✅ All API endpoints
- ✅ Real-time notifications
- ✅ User authentication (with DEV_MODE bypass)

---

## 🛠️ **Development Workflow:**

1. **Start Backend** (already running):
   ```powershell
   cd backend
   python server.py
   ```

2. **Start Frontend** (in new terminal):
   ```powershell
   cd frontend
   npm start
   ```

3. **Access App:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/docs
   - WebSocket: ws://localhost:8000/api/ws/alerts

---

## 📝 **SQLite vs PostgreSQL:**

| Feature | SQLite (Local) | PostgreSQL (Render) |
|---------|----------------|---------------------|
| Setup | Instant | Requires deployment |
| Connection | No network needed | IP whitelist required |
| Performance | Fast for dev | Scalable for prod |
| Tables | Auto-created | Auto-created on deploy |
| Data | Local only | Shared (production) |
| Cost | Free | Free tier (1GB) |

---

## 🔍 **Troubleshooting:**

### Backend not responding?
```powershell
# Check if server is running
Get-Process -Name python

# Restart backend
cd backend
python server.py
```

### Database errors?
```powershell
# Delete and recreate database
del backend\suraksha_setu.db
cd backend
python server.py  # Auto-creates tables
```

### WebSocket still failing?
```powershell
# Check backend logs in terminal
# Look for "WebSocket /api/ws/alerts" messages

# Test WebSocket in browser console:
const ws = new WebSocket('ws://localhost:8000/api/ws/alerts');
ws.onopen = () => console.log('✅ Connected');
ws.onerror = (e) => console.log('❌ Error:', e);
```

---

## 🚀 **Next Steps:**

### For Local Development:
1. ✅ Backend running with SQLite
2. ✅ Frontend connects to localhost:8000
3. ✅ Test all features offline
4. ✅ Develop without internet/cloud dependencies

### For Production Deployment:
1. Follow [RENDER_DEPLOYMENT_GUIDE.md](../RENDER_DEPLOYMENT_GUIDE.md)
2. Deploy backend to Render (auto-uses PostgreSQL)
3. Update frontend `REACT_APP_BACKEND_URL`
4. Push to production

---

## 📞 **Support:**

**Local Development Works:** ✅  
**Production Deployment Ready:** ✅  
**Database Tables Created:** ✅  
**WebSocket Enabled:** ✅  

Your app is now **fully functional locally**! 🎉

---

**Last Updated:** February 10, 2026  
**Database:** SQLite (suraksha_setu.db)  
**Backend:** http://localhost:8000  
**Frontend:** http://localhost:3000
