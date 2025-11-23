# 🚀 Deploying Suraksha Setu on Render (Manual Dashboard Deployment)

This guide walks you through deploying directly from the Render dashboard - no YAML configuration needed!

## Prerequisites
- GitHub account with your repository
- Render account (free tier available) - [Sign up here](https://render.com)
- MongoDB Atlas account (free tier available) - [Sign up here](https://www.mongodb.com/cloud/atlas)
- Google Gemini API key - [Get one here](https://makersuite.google.com/app/apikey)

## Step-by-Step Deployment Guide

### 1. Prepare MongoDB Database

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in
2. Click **"Create"** to create a new free cluster (M0 tier)
3. Choose a cloud provider and region closest to you
4. Click **"Create Cluster"** and wait 1-3 minutes
5. Create a database user:
   - Click **"Database Access"** in left sidebar
   - Click **"Add New Database User"**
   - Choose **Username and Password** authentication
   - Enter username (e.g., `admin`) and generate a strong password
   - Save the password securely!
   - Click **"Add User"**
6. Whitelist IP addresses:
   - Click **"Network Access"** in left sidebar
   - Click **"Add IP Address"**
   - Click **"Allow Access from Anywhere"** (adds 0.0.0.0/0)
   - Click **"Confirm"**
7. Get your connection string:
   - Click **"Database"** in left sidebar
   - Click **"Connect"** on your cluster
   - Choose **"Connect your application"**
   - Copy the connection string (looks like: `mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)
   - Replace `<password>` with your actual database password
   - Save this connection string - you'll need it soon!

### 2. Ensure Code is Pushed to GitHub

Make sure all your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 3. Deploy Backend on Render

1. Go to [Render Dashboard](https://dashboard.render.com/) and sign in
2. Click the **"New +"** button at the top right
3. Select **"Web Service"** from the dropdown
4. Connect your GitHub account if not already connected:
   - Click **"Connect GitHub"**
   - Authorize Render to access your repository
5. Select your repository: **`samratmaurya1217/Project`**
6. Configure the backend service with these exact settings:

   **Basic Settings:**
   - **Name**: `suraksha-setu-backend` (or any name you prefer)
   - **Region**: Choose the region closest to you (e.g., Singapore, Oregon)
   - **Branch**: `main`
   - **Root Directory**: `backend` ⚠️ **IMPORTANT: Must be "backend"**
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`

7. Scroll down to **"Environment Variables"** section
8. Click **"Add Environment Variable"** and add these one by one:
   
   | Key | Value |
   |-----|-------|
   | `MONGO_URL` | Your MongoDB connection string from Step 1 |
   | `DB_NAME` | `suraksha_setu` |
   | `GEMINI_API_KEY` | Your Google Gemini API key |
   | `JWT_SECRET` | Any random 32+ character string (e.g., `your-super-secret-jwt-key-here-123456`) |
   | `CORS_ORIGINS` | `*` |

9. Click **"Create Web Service"** button at the bottom
10. Wait for deployment to complete (takes 5-10 minutes)
    - You'll see build logs in real-time
    - Look for "Your service is live 🎉" message
11. **IMPORTANT**: Copy your backend URL from the top of the page
    - It will look like: `https://suraksha-setu-backend-xxxx.onrender.com`
    - Save this URL - you'll need it for frontend deployment!

### 4. Deploy Frontend on Render

1. Go back to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** button at the top right
3. Select **"Static Site"** from the dropdown
4. Select your repository again: **`samratmaurya1217/Project`**
5. Configure the frontend service with these exact settings:

   **Basic Settings:**
   - **Name**: `suraksha-setu-frontend` (or any name you prefer)
   - **Branch**: `main`
   - **Root Directory**: `frontend` ⚠️ **IMPORTANT: Must be "frontend"**
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`

6. Scroll down to **"Environment Variables"** section
7. Click **"Add Environment Variable"** and add:
   
   | Key | Value |
   |-----|-------|
   | `REACT_APP_API_URL` | Your backend URL + `/api` (e.g., `https://suraksha-setu-backend-xxxx.onrender.com/api`) |

   ⚠️ **IMPORTANT**: Don't forget to add `/api` at the end of your backend URL!

8. Click **"Create Static Site"** button at the bottom
9. Wait for deployment to complete (takes 5-10 minutes)
   - You'll see build logs in real-time
   - Look for "Your site is live 🎉" message
10. Your frontend will be available at a URL like: `https://suraksha-setu-frontend.onrender.com`

### 5. Optional: Update CORS Settings (More Secure)

If you want to restrict your backend to only accept requests from your frontend:

1. Go back to your backend service on Render dashboard
2. Click on **"Environment"** in the left sidebar
3. Find the `CORS_ORIGINS` variable and click **Edit**
4. Change the value from `*` to your frontend URL (e.g., `https://suraksha-setu-frontend.onrender.com`)
5. Click **"Save Changes"**
6. The backend will automatically redeploy with the new settings

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
