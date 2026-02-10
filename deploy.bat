@echo off
echo ======================================
echo  Suraksha Setu - Firebase Deployment
echo ======================================
echo.

echo Step 1: Building React app...
cd frontend
call npm run build
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)
cd ..

echo.
echo Step 2: Deploying to Firebase Hosting...
call firebase deploy --only hosting

echo.
echo ======================================
echo  Deployment Complete!
echo  Your app: https://surakhsa-setu.web.app
echo ======================================
pause
