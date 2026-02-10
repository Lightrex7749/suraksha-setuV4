# Firebase Authentication Setup Guide

Suraksha Setu now uses Firebase Authentication for secure user management with email/password and Google Sign-In support.

## 📋 Prerequisites

- A Google account
- Node.js and Python installed
- Firebase CLI (optional, for advanced features)

## 🔥 Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add Project"** or **"Create a Project"**
3. Enter project name: `suraksha-setu` (or your preferred name)
4. Disable Google Analytics (optional) or link to existing account
5. Click **"Create Project"** and wait for setup to complete

## 🌐 Step 2: Enable Authentication Methods

### Enable Email/Password Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **"Get Started"**
3. Go to **"Sign-in method"** tab
4. Click on **"Email/Password"**
5. Enable the first toggle (Email/Password)
6. Click **"Save"**

### Enable Google Sign-In

1. In the same **"Sign-in method"** tab
2. Click on **"Google"**
3. Enable the toggle
4. Enter your project support email
5. Click **"Save"**

## 🔑 Step 3: Get Web App Configuration

1. In Firebase Console, go to **Project Settings** (⚙️ gear icon)
2. Scroll down to **"Your apps"** section
3. Click the **Web icon** (`</>`)
4. Register app with nickname: `Suraksha Setu Web`
5. **Don't** enable Firebase Hosting (we're using our own)
6. Click **"Register app"**
7. Copy the `firebaseConfig` object

It will look like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef"
};
```

## ⚙️ Step 4: Configure Frontend

### Option A: Create `.env.local` file (Recommended)

1. In the `frontend` folder, create a file named `.env.local`
2. Add your Firebase configuration:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890abcdef

# Backend API
REACT_APP_BACKEND_URL=http://localhost:8000
```

### Option B: Update `firebase.js` directly (Not recommended for production)

Edit `frontend/src/config/firebase.js` and replace the `firebaseConfig` values.

## 🔐 Step 5: Setup Backend (Optional - For Token Verification)

### Download Service Account Key

1. In Firebase Console → **Project Settings** → **Service Accounts**
2. Click **"Generate New Private Key"**
3. Click **"Generate Key"** to download JSON file
4. Save as `serviceAccountKey.json` in the `backend` folder
5. **⚠️ NEVER commit this file to Git!**

### Configure Backend Environment

Edit `backend/.env`:

```env
# Firebase Authentication - OPTION 1: Service Account File
FIREBASE_SERVICE_ACCOUNT_PATH=serviceAccountKey.json

# Firebase Authentication - OPTION 2: Project ID only (simpler)
FIREBASE_PROJECT_ID=your-project-id
```

**Note:** For local development, Firebase verification is optional. The backend will work without it.

## 🚀 Step 6: Run the Application

### Start Backend

```bash
cd backend
python server.py
```

### Start Frontend

```bash
cd frontend
npm start
```

## ✅ Step 7: Test Authentication

1. Go to http://localhost:3000
2. Click **"Create Account"** or **"Sign In"**
3. Try both methods:
   - **Email/Password**: Enter email and password
   - **Google Sign-In**: Click Google button

## 🔒 Security Best Practices

### Production Deployment

1. **Environment Variables**: Use platform-specific secret management
   - Vercel: Environment Variables in dashboard
   - Netlify: Site Settings → Environment
   - Render: Environment tab in dashboard

2. **Authorized Domains**: In Firebase Console → Authentication → Settings
   Add your production domain (e.g., `yourapp.com`)

3. **API Key Restrictions**: In Google Cloud Console
   Restrict Firebase API key to your domains

### Git Security

Make sure these files are in `.gitignore`:

```gitignore
# Frontend
frontend/.env.local
frontend/.env

# Backend
backend/.env
backend/serviceAccountKey.json
backend/firebase-adminsdk-*.json
```

## 🛠️ Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"

- Check that all Firebase config values are correct
- Ensure `.env.local` is in the `frontend` folder
- Restart the development server (`npm start`)

### "Firebase: Error (auth/unauthorized-domain)"

- Go to Firebase Console → Authentication → Settings → Authorized domains
- Add `localhost` and your production domain

### "Token verification failed" on backend

- Ensure service account key is in the correct location
- Check that `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_PROJECT_ID` is set
- Verify the service account has the required permissions

### Google Sign-In popup closes immediately

- Check browser popup blocker settings
- Ensure authorized domains include your current domain
- Clear browser cache and cookies

## 📚 Additional Resources

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [React Firebase Hooks](https://github.com/CSFrequency/react-firebase-hooks)

## 🎯 Next Steps

- [ ] Add password reset functionality
- [ ] Implement email verification
- [ ] Add more OAuth providers (GitHub, Facebook, etc.)
- [ ] Set up custom user claims for role-based access
- [ ] Enable multi-factor authentication (MFA)

## 💡 Features Enabled

✅ Email/Password Registration  
✅ Email/Password Login  
✅ Google OAuth Sign-In  
✅ Automatic token management  
✅ Secure token storage  
✅ Protected routes  
✅ User session persistence  
✅ Backend token verification (optional)

---

**Need Help?** Check the [Firebase Support](https://firebase.google.com/support) or open an issue in the repository.
