# 🚀 Deploying Suraksha Setu on Render (Simple Steps)

Deploy your app directly from the Render dashboard in minutes!

## Prerequisites

- ✅ GitHub account with your repository
- ✅ Render account (free tier) - [Sign up here](https://render.com)
- ✅ Google Gemini API key - [Get one here](https://makersuite.google.com/app/apikey)

## Quick Deployment Steps

### Step 1: Push Your Code to GitHub

Make sure all your code is on GitHub:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy Backend on Render

1. Go to [Render Dashboard](https://dashboard.render.com/) and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: **`samratmaurya1217/Project`**
4. Fill in these settings:

   | Setting | Value |
   |---------|-------|
   | **Name** | `suraksha-setu-backend` |
   | **Region** | Choose closest to you |
   | **Branch** | `main` |
   | **Root Directory** | `backend` |
   | **Environment** | `Python 3` |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `uvicorn server:app --host 0.0.0.0 --port $PORT` |
   | **Instance Type** | `Free` |

5. Add **Environment Variables** (click "Add Environment Variable"):
   
   | Key | Value |
   |-----|-------|
   | `GEMINI_API_KEY` | Your Google Gemini API key |
   | `JWT_SECRET` | Any random string (e.g., `my-secret-key-123456`) |

6. Click **"Create Web Service"**
7. Wait 5-10 minutes for deployment
8. **Copy your backend URL** (e.g., `https://suraksha-setu-backend.onrender.com`)

### Step 3: Deploy Frontend on Render

1. Go back to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Static Site"**
3. Select your repository: **`samratmaurya1217/Project`**
4. Fill in these settings:

   | Setting | Value |
   |---------|-------|
   | **Name** | `suraksha-setu-frontend` |
   | **Branch** | `main` |
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm install && npm run build` |
   | **Publish Directory** | `build` |

5. Add **Environment Variable**:
   
   | Key | Value |
   |-----|-------|
   | `REACT_APP_API_URL` | Your backend URL + `/api` (e.g., `https://suraksha-setu-backend.onrender.com/api`) |

6. Click **"Create Static Site"**
7. Wait 5-10 minutes for deployment
8. Your app is live! 🎉

### 6. Test Your Deployment

1. Visit your frontend URL
2. Test all features:
   - ✅ Login/Register
   - ✅ Dashboard
   - ✅ Map view
   - ✅ Chatbot
   - ✅ All working!

## 🔧 Troubleshooting

**Backend not working?**
- Check logs in Render dashboard
- Verify `GEMINI_API_KEY` is set correctly
- Check all environment variables

**Frontend not loading?**
- Open browser console (F12) for errors
- Verify `REACT_APP_API_URL` has `/api` at end
- Make sure backend is deployed first

**App slow on first load?**
- Normal for free tier! Services spin down after 15 min
- First request takes 30-60 seconds to wake up

## 📝 Important Notes

- **Free Tier**: Services spin down after 15 min of inactivity
- **Never commit**: Don't push `.env` files to GitHub
- **API URL**: Always add `/api` at the end for frontend

## 🎉 Done!

Your app is live at:
- **Frontend**: `https://suraksha-setu-frontend.onrender.com`
- **Backend**: `https://suraksha-setu-backend.onrender.com`
- **API Docs**: `https://suraksha-setu-backend.onrender.com/docs`

That's it! Share your app! 🛡️
