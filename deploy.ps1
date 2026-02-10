# Suraksha Setu - Firebase Deployment Script
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Suraksha Setu - Firebase Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Building React app..." -ForegroundColor Yellow
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    Set-Location ..
    Read-Host "Press Enter to exit"
    exit 1
}
Set-Location ..

Write-Host ""
Write-Host "Step 2: Deploying to Firebase Hosting..." -ForegroundColor Yellow
firebase deploy --only hosting

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host " Deployment Complete!" -ForegroundColor Green
Write-Host " Your app: https://surakhsa-setu.web.app" -ForegroundColor Green
Write-Host " Admin: https://surakhsa-setu.firebaseapp.com" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Read-Host "Press Enter to exit"
