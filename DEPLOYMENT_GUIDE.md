# 🚀 Deploying Suraksha Setu on Render

## Prerequisites
- GitHub account with your repository
- Render account (free tier available)
- MongoDB Atlas account (free tier available)

## Step-by-Step Deployment Guide

### 1. Prepare MongoDB Database

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist all IP addresses (0.0.0.0/0) for Render
5. Get your connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)

### 2. Push Code to GitHub

```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

### 3. Deploy Backend on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the backend:
   - **Name**: `suraksha-setu-backend`
   - **Region**: Choose nearest
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free

5. Add Environment Variables:
   - `MONGO_URL` = Your MongoDB connection string
   - `DB_NAME` = `suraksha_setu`
   - `GEMINI_API_KEY` = Your Gemini API key
   - `JWT_SECRET` = Any random secure string
   - `CORS_ORIGINS` = `*` (or your frontend URL later)

6. Click **"Create Web Service"**
7. Wait for deployment (takes 5-10 minutes)
8. **Copy your backend URL** (e.g., `https://suraksha-setu-backend.onrender.com`)

### 4. Deploy Frontend on Render

1. Click **"New +"** → **"Static Site"**
2. Connect your GitHub repository again
3. Configure the frontend:
   - **Name**: `suraksha-setu-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`

4. Add Environment Variable:
   - `REACT_APP_API_URL` = Your backend URL from step 3.8 + `/api`
     - Example: `https://suraksha-setu-backend.onrender.com/api`

5. Click **"Create Static Site"**
6. Wait for deployment (takes 5-10 minutes)

### 5. Update CORS Settings

1. Go back to your backend service on Render
2. Update the `CORS_ORIGINS` environment variable:
   - Value: Your frontend URL (e.g., `https://suraksha-setu-frontend.onrender.com`)
3. The backend will automatically redeploy

### 6. Test Your Deployment

1. Visit your frontend URL
2. Test the following features:
   - ✅ Login/Register
   - ✅ Dashboard loads
   - ✅ Map view works
   - ✅ Chatbot responds
   - ✅ Weather data loads
   - ✅ Alerts display

## 🔧 Troubleshooting

### Backend Issues
- Check logs in Render dashboard
- Verify MongoDB connection string is correct
- Ensure all environment variables are set
- Check that CORS_ORIGINS includes your frontend URL

### Frontend Issues
- Verify `REACT_APP_API_URL` points to correct backend
- Check browser console for errors
- Ensure backend is deployed and running first

### Database Issues
- Verify MongoDB Atlas IP whitelist includes 0.0.0.0/0
- Check database user permissions
- Ensure connection string includes database name

## 📝 Important Notes

1. **Free Tier Limitations**:
   - Backend spins down after 15 min of inactivity (first request will be slow)
   - 750 hours/month free (sufficient for one project)
   - Limited bandwidth

2. **Environment Variables**:
   - Never commit `.env` files to GitHub
   - Set all secrets in Render dashboard
   - Update frontend API URL after backend deployment

3. **Custom Domain** (Optional):
   - You can add custom domains in Render settings
   - Free SSL certificates included

## 🎉 Success!

Once deployed, your Suraksha Setu application will be live at:
- **Frontend**: `https://suraksha-setu-frontend.onrender.com`
- **Backend**: `https://suraksha-setu-backend.onrender.com`
- **API Docs**: `https://suraksha-setu-backend.onrender.com/docs`

Share your live URLs and enjoy your deployed disaster management system! 🛡️
