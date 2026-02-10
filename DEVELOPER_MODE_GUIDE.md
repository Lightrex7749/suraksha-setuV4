# 🔧 Developer Mode Guide

## Overview
This guide explains how to use the Developer Mode features for testing and development without Firebase authentication.

## Current Status
✅ **Dev Mode is ENABLED** - Authentication is bypassed for easy testing

## Quick Start

### Option 1: Quick Join (Login Page)
1. Navigate to the login page (`/login`)
2. You'll see a **"Quick Join (Testing)"** section at the bottom
3. Click any role button to instantly access the app:
   - **Developer** - Full access to ALL tabs (recommended for testing)
   - **Admin** - Full control with admin dashboard
   - **Scientist** - Data & analysis portal
   - **Student** - Learning portal with quizzes
   - **Citizen** - Basic user access

### Option 2: Regular Login (With Any Credentials)
1. Enter any email and password
2. Click "Sign in with Email"
3. You'll be logged in as a citizen by default
4. Use the role switcher to change roles

## Role Switcher

### How to Switch Roles (While Logged In)
1. Look at the **left sidebar** (bottom section)
2. Click the **"Switch Role"** button
3. Select any role from the dropdown:
   - Developer (All Access)
   - Admin
   - Scientist
   - Student
   - Citizen

### Role Access Levels

| Role | Base Tabs | Student Portal | Scientist Portal | Admin Dashboard |
|------|-----------|----------------|------------------|-----------------|
| **Developer** | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ✅ |
| **Scientist** | ✅ | ❌ | ✅ | ❌ |
| **Student** | ✅ | ✅ | ❌ | ❌ |
| **Citizen** | ✅ | ❌ | ❌ | ❌ |

**Base Tabs Available to All:**
- Dashboard
- Live Map
- Alerts Center
- Weather & AQI
- Disasters
- Analytics
- Community
- Critical Contacts

## Features

### 🎯 Developer Role Benefits
- Access to **ALL tabs** simultaneously
- Perfect for testing all features
- No need to switch roles to test different portals
- Full visibility of the entire application

### ⚡ Quick Join Benefits
- **Instant access** - No typing credentials
- **One-click login** - Test different roles immediately
- **Visual indicators** - Each role has a unique icon and color
- **Dev mode badge** - Always visible in header

### 🔄 Role Switching Benefits
- **Live role changes** - No logout required
- **Persistent session** - Changes saved in localStorage
- **Easy testing** - Test role-based features quickly
- **Sidebar indicator** - Current role always visible

## Dev Mode Indicators

### Visual Cues
1. **Header Badge**: Yellow "DEV MODE" badge in top-right corner
2. **Login Page**: Quick Join section with colored role buttons
3. **Sidebar**: Role switcher button (only in dev mode)
4. **User Badge**: Shows current role in sidebar

## Configuration

### Enabling/Disabling Dev Mode

**File**: `frontend/src/contexts/AuthContext.js`

```javascript
// Line 7
const DEV_MODE = true; // Change to false to disable
```

**To Disable Dev Mode:**
1. Change `DEV_MODE = true` to `DEV_MODE = false`
2. Configure Firebase authentication
3. Users will need real credentials to log in

## Technical Details

### Authentication Flow (Dev Mode)

```
1. User clicks Quick Join → quickJoin(role) function
2. Mock user created with selected role
3. User stored in localStorage
4. Automatically navigated to dashboard
5. MainLayout reads role and shows appropriate tabs
```

### Data Persistence
- User data stored in `localStorage` as `auth_user`
- Token stored in `localStorage` as `auth_token`
- Data persists across page refreshes
- Cleared on logout

### Mock User Structure
```javascript
{
  id: 'dev_developer_1234567890',
  email: 'developer@dev.local',
  name: 'Developer (Full Access)',
  photoURL: null,
  role: 'developer',
  emailVerified: true
}
```

## Testing Workflows

### Workflow 1: Testing All Features
1. Quick Join as **Developer**
2. Access all tabs from sidebar
3. Test each feature
4. Switch role if needed using sidebar switcher

### Workflow 2: Testing Role-Based Access
1. Quick Join as **Citizen**
2. Verify only base tabs are visible
3. Use role switcher to become **Student**
4. Verify student portal appears
5. Continue testing other roles

### Workflow 3: Testing Authentication Flow
1. Logout (if logged in)
2. Try regular login with any credentials
3. Get logged in as citizen
4. Use role switcher to change role

## Troubleshooting

### Issue: Quick Join not visible
**Solution**: Check that `DEV_MODE = true` in AuthContext.js

### Issue: Role switcher not showing
**Solution**: 
1. Ensure dev mode is enabled
2. Check that you're logged in
3. Expand the sidebar (not collapsed)

### Issue: Tab not appearing after role switch
**Solution**: 
1. The role switch happens instantly
2. Check the sidebar - new tabs should appear
3. Try refreshing the page if needed

### Issue: Logout doesn't work
**Solution**: 
1. In dev mode, logout clears localStorage
2. Reload the page to return to login screen

## Production Deployment

### Before Deploying to Production:
1. ✅ Set `DEV_MODE = false` in AuthContext.js
2. ✅ Configure Firebase authentication properly
3. ✅ Test with real Firebase auth
4. ✅ Remove or comment out quick join code (optional)
5. ✅ Update environment variables

### Security Notes
- Dev mode should **NEVER** be enabled in production
- Quick join bypasses all authentication
- Role switching allows privilege escalation
- Only use for local development and testing

## Additional Features

### Auto-Login on Page Refresh
- If you're logged in and refresh the page
- Your session is restored from localStorage
- You remain logged in with the same role

### Email-Based Role Detection
When using regular login, you can set roles by email pattern:
- No need to modify code
- Just use role switcher after login

## API Integration

### With Backend
When dev mode is disabled and Firebase is configured:
- User authentication handled by Firebase
- Token sent with API requests
- Backend validates Firebase tokens
- Role assigned by backend

### Current Setup (Dev Mode)
- Mock token used: `dev_token_1234567890`
- Backend should accept any token in dev mode
- Or mock the backend responses

## Need Help?

### Common Questions
**Q: Can I add custom roles?**
A: Yes! Edit the `quickJoin` function in AuthContext.js and add the role to MainLayout navigation logic.

**Q: How do I persist a specific role?**
A: Once you switch to a role, it's automatically saved in localStorage until you logout.

**Q: Can I test without the quick join buttons?**
A: Yes! Use regular login (any credentials work) then use the role switcher.

## Summary
- ✅ Dev mode enabled for easy testing
- ✅ Quick join buttons on login page
- ✅ Role switcher in sidebar
- ✅ Developer role has full access to all tabs
- ✅ No authentication required
- ✅ Perfect for development and testing

**Happy Testing! 🚀**
