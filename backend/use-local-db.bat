@echo off
REM Switch to Local Development Database (SQLite)
echo ==================================================
echo   SURAKSHA SETU - LOCAL DEVELOPMENT MODE
echo ==================================================
echo.
echo Switching to SQLite database for local testing...
echo.

copy /Y .env.local .env >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Switched to local development database
    echo.
    echo Database: SQLite (suraksha_setu.db)
    echo Backend: http://localhost:8000
    echo.
    echo To start backend:
    echo   python server.py
    echo.
) else (
    echo [ERROR] Failed to switch configuration
    echo Make sure .env.local exists
)

echo ==================================================
pause
