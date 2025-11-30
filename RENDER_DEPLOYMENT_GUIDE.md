# Render Deployment Guide for Suraksha Setu

## 📋 Pre-Deployment Checklist

### Backend Environment Variables (Set in Render Dashboard)
1. **GEMINI_API_KEY**: Your Google Gemini API key
   - Get from: https://makersuite.google.com/app/apikey
   - Example: `AIzaSyCViwFwiK4YxxW-XViDIh-w6R9PmZdI5Hg`

2. **MONGO_URL** (Optional - if using MongoDB):
   - Example: `mongodb+srv://username:password@cluster.mongodb.net/`
   - Leave empty to use in-memory storage

3. **DB_NAME** (Optional):
   - Example: `suraksha_setu`
   - Default: `disaster_management`

4. **JWT_SECRET**:
   - Generate a secure random string
   - Example: `your-super-secret-jwt-key-change-this-in-production`

5. **CORS_ORIGINS**: 
   - Set to your frontend URL or use `*` for development
   - Example: `https://suraksha-setu-frontend.onrender.com`

### Frontend Environment Variables (Set in Render Dashboard)
1. **REACT_APP_BACKEND_URL**: Your backend URL
   - Example: `https://suraksha-setu-backend.onrender.com`
   - ⚠️ **DO NOT include /api at the end**

## 🚀 Deployment Steps

### Step 1: Push to GitHub
```bash
git add -A
git commit -m "Configure for Render deployment"
git push origin main
```

### Step 2: Deploy Backend on Render
1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml`
5. Select **suraksha-setu-backend** service
6. Add environment variables in the dashboard:
   - `GEMINI_API_KEY`: (your key)
   - `JWT_SECRET`: (generate random string)
   - `CORS_ORIGINS`: `*` (or your frontend URL)
   - `DB_NAME`: `disaster_management`
7. Click **Create Web Service**
8. Wait for deployment (5-10 minutes)
9. **Copy your backend URL** (e.g., `https://suraksha-setu-backend.onrender.com`)

### Step 3: Deploy Frontend on Render
1. In Render Dashboard, select **suraksha-setu-frontend** service
2. Add environment variable:
   - `REACT_APP_BACKEND_URL`: `https://suraksha-setu-backend.onrender.com`
   - ⚠️ Use the URL from Step 2
3. Click **Create Web Service**
4. Wait for deployment (3-5 minutes)

### Step 4: Verify Deployment
1. Open your frontend URL: `https://suraksha-setu-frontend.onrender.com`
2. Check browser console (F12) for connection errors
3. Test chatbot functionality
4. Check backend health: `https://suraksha-setu-backend.onrender.com/health`

## 🔧 Troubleshooting

### Issue: "Cannot connect to server" in chatbot
**Solution**: 
- Check if `REACT_APP_BACKEND_URL` is set correctly in Render dashboard
- Verify backend is running: Visit backend URL + `/health`
- Check CORS settings in backend

### Issue: 502 Bad Gateway
**Solution**:
- Backend is starting up (Render free tier sleeps after inactivity)
- Wait 1-2 minutes and try again
- Check backend logs in Render dashboard

### Issue: Chatbot shows "AI service temporarily unavailable"
**Solution**:
- Verify `GEMINI_API_KEY` is set in backend environment variables
- Check if API key has rate limits
- Review backend logs for Gemini API errors

### Issue: Frontend shows old localhost URL
**Solution**:
- Rebuild frontend service in Render dashboard
- Clear browser cache (Ctrl+Shift+R)
- Verify `REACT_APP_BACKEND_URL` is set in Render

## 📝 Important Notes

1. **Free Tier Limitations**:
   - Services sleep after 15 minutes of inactivity
   - First request after sleep takes 30-60 seconds
   - 750 hours/month free

2. **Environment Variables**:
   - Must be set in Render Dashboard, not in code
   - Frontend variables must start with `REACT_APP_`
   - Changes require rebuild/redeploy

3. **CORS Configuration**:
   - Set `CORS_ORIGINS=*` for testing
   - For production, set to specific frontend URL

4. **MongoDB**:
   - Optional - app works with in-memory storage
   - Use MongoDB Atlas for persistent data

## 🔗 Useful Links

- Render Dashboard: https://dashboard.render.com
- Backend Logs: Click service → Logs tab
- Frontend Build Logs: Click service → Events tab
- Gemini API Keys: https://makersuite.google.com/app/apikey

## ✅ Quick Check Commands

Test backend:
```bash
curl https://your-backend-url.onrender.com/health
```

Test chatbot API:
```bash
curl -X POST https://your-backend-url.onrender.com/api/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","session_id":"test123"}'
```

## 🎉 Success Indicators

✅ Backend health endpoint returns `{"status":"ok"}`
✅ Frontend loads without console errors
✅ Chatbot opens and shows welcome message
✅ Can send messages and receive AI responses
✅ Dynamic suggestions appear when typing
