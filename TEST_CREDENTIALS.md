# Authentication System - Test Credentials

## Test Users Created

All passwords follow the pattern: `{role}123`

### 1. Admin User
- **Email:** admin@test.com
- **Password:** admin123
- **Type:** Administrator
- **Redirect:** /admin

### 2. Student User
- **Email:** student@example.com
- **Password:** student123
- **Type:** Student
- **Redirect:** /student

### 3. Scientist User
- **Email:** scientist@test.com
- **Password:** test123
- **Type:** Scientist
- **Redirect:** /scientist

### 4. Citizen User
- **Email:** citizen@test.com
- **Password:** citizen123
- **Type:** Citizen
- **Redirect:** /dashboard

## Features Implemented

### Backend (FastAPI)
✅ User model with UUID, name, email, hashed password, user_type
✅ POST /api/auth/register - Register new users
✅ POST /api/auth/login - Login and get JWT token
✅ GET /api/auth/me - Get current user info
✅ JWT token authentication (7-day expiry)
✅ Password hashing with bcrypt
✅ Email validation
✅ User type validation (student, scientist, admin, citizen)

### Frontend (React)
✅ Register page with form validation
✅ Login page with API integration
✅ AuthContext for state management
✅ Token storage in localStorage
✅ User info display in sidebar
✅ Logout functionality
✅ Automatic redirect based on user type
✅ Error handling and loading states
✅ Data-testid attributes for testing

## API Endpoints

### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "user_type": "citizen"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Get Current User
```bash
GET /api/auth/me
Authorization: Bearer {token}
```

## User Flow

1. User visits /register
2. Fills form with name, email, password, and selects user type
3. On successful registration, receives JWT token
4. Token and user data stored in localStorage
5. Redirected to appropriate portal based on user type
6. User info displayed in sidebar with logout option
7. Can logout anytime, which clears localStorage and redirects to /login

## Routes

- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - Citizen portal
- `/student` - Student portal
- `/scientist` - Scientist portal
- `/admin` - Admin portal
