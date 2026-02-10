# 🚀 Firebase Hosting Deployment Guide

Complete guide to deploy Suraksha Setu to Firebase Hosting.

## ✅ Prerequisites

- [x] Firebase CLI installed ✅
- [x] Firebase project created: `surakhsa-setu` ✅
- [x] Configuration files created ✅

## 📝 Manual Steps Required

### Step 1: Complete Firebase Login

Since terminal prompts require manual interaction, please open a **new PowerShell window** and run:

```powershell
cd D:\ProjectsGit\Project
firebase login
```

**Answer the prompts:**
1. "Enable Gemini in Firebase features?" → Type `Y` and press Enter
2. "Allow Firebase to collect CLI usage?" → Type `Y` and press Enter
3. Browser will open → Sign in with your Google account
4. Authorize Firebase CLI → Click "Allow"
5. You should see: ✅ "Success! Logged in as your.email@gmail.com"

### Step 2: Verify Firebase Project

After login, verify the project is linked:

```powershell
firebase projects:list
```

You should see `surakhsa-setu` in the list.

### Step 3: Build the React App

```powershell
cd frontend
npm run build
```

This creates an optimized production build in `frontend/build/`

**Expected output:**
```
Creating an optimized production build...
Compiled successfully.
File sizes after gzip:
  [size details...]
The build folder is ready to be deployed.
```

### Step 4: Deploy to Firebase Hosting

Return to project root and deploy:

```powershell
cd ..
firebase deploy --only hosting
```

**Expected output:**
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/surakhsa-setu/overview
Hosting URL: https://surakhsa-setu.web.app
```

## 🎯 Quick Deploy Scripts

After completing the initial login once, you can use these scripts for future deployments:

### Option A: PowerShell Script (Recommended)

```powershell
.\deploy.ps1
```

### Option B: Batch Script

```batch
deploy.bat
```

### Option C: Manual Commands

```powershell
# Build frontend
cd frontend
npm run build
cd ..

# Deploy to Firebase
firebase deploy --only hosting
```

## 🌐 After Deployment

Your app will be live at:
- **Production URL**: https://surakhsa-setu.web.app
- **Alt URL**: https://surakhsa-setu.firebaseapp.com
- **Admin Console**: https://console.firebase.google.com/project/surakhsa-setu/hosting

## 🔧 Configuration Files Created

### `firebase.json`
```json
{
  "hosting": {
    "public": "frontend/build",
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

### `.firebaserc`
```json
{
  "projects": {
    "default": "surakhsa-setu"
  }
}
```

## 🔐 Environment Variables for Production

Before deploying, update `frontend/.env.production`:

```env
# Backend API URL (update after backend deployment)
REACT_APP_BACKEND_URL=https://your-backend-url.onrender.com

# Firebase (already configured)
REACT_APP_FIREBASE_API_KEY=AIzaSyBR0Kbv95na40v8WdznKLiyruGkY70keuc
REACT_APP_FIREBASE_AUTH_DOMAIN=surakhsa-setu.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=surakhsa-setu
REACT_APP_FIREBASE_STORAGE_BUCKET=surakhsa-setu.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=791422434644
REACT_APP_FIREBASE_APP_ID=1:791422434644:web:f1207980bf4ce64b50dcc1
```

## 🎨 Authorized Domains

After deployment, add your Firebase Hosting domain to authorized domains:

1. Go to [Firebase Console](https://console.firebase.google.com/project/surakhsa-setu/authentication/settings)
2. Click **Settings** tab
3. Scroll to **Authorized domains**
4. Your domains should automatically include:
   - `surakhsa-setu.web.app` ✅
   - `surakhsa-setu.firebaseapp.com` ✅
   - `localhost` ✅

## 🔄 Continuous Deployment

### GitHub Actions (Optional)

Create `.github/workflows/firebase-hosting.yml`:

```yaml
name: Deploy to Firebase Hosting
on:
  push:
    branches:
      - main
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install deps and build
        run: |
          cd frontend
          npm ci
          npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: surakhsa-setu
```

## 📊 Deployment Checklist

Before deploying to production:

- [ ] Update backend API URL in `.env.production`
- [ ] Test build locally: `npm run build`
- [ ] Check Firebase authorized domains
- [ ] Verify authentication works on localhost
- [ ] Build completes without errors
- [ ] Deploy to Firebase Hosting
- [ ] Test deployed app
- [ ] Verify authentication on production URL
- [ ] Check all features work
- [ ] Monitor Firebase Console for errors

## 🐛 Troubleshooting

### Build Fails

```powershell
# Clear cache and rebuild
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force build
npm install
npm run build
```

### Deploy Fails - Not Logged In

```powershell
firebase login --reauth
```

### 404 on Sub-routes

The `firebase.json` includes rewrite rules. If you still get 404s:
- Verify `"rewrites"` is in `firebase.json`
- Check `public` path is `frontend/build`

### Authentication Not Working

1. Check authorized domains in Firebase Console
2. Verify `firebaseConfig` in `firebase.js`
3. Check browser console for errors

## 📈 Performance Tips

### Enable Compression

Already configured in `firebase.json`:
- Static assets cached for 1 year
- HTML/API requests not cached
- Automatic gzip compression

### Analyze Bundle Size

```powershell
cd frontend
npm run build -- --stats
npx webpack-bundle-analyzer build/bundle-stats.json
```

## 🎉 Success Indicators

After deployment, verify:

✅ App loads at https://surakhsa-setu.web.app  
✅ Login/Register works  
✅ Google Sign-In works  
✅ Dashboard loads  
✅ API calls work (check Network tab)  
✅ Routes work (no 404s)  
✅ PWA installable  
✅ Mobile responsive  

## 🔗 Useful Links

- **Firebase Console**: https://console.firebase.google.com/project/surakhsa-setu
- **Hosting Dashboard**: https://console.firebase.google.com/project/surakhsa-setu/hosting
- **Analytics**: https://console.firebase.google.com/project/surakhsa-setu/analytics
- **Authentication**: https://console.firebase.google.com/project/surakhsa-setu/authentication

---

**Next Step**: Open a new PowerShell window and run `firebase login` to complete the authentication!
