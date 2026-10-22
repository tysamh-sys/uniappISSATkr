@echo off
title University Attendance API - Docker Launcher
cd /d "%~dp0"

echo ========================================================
echo   University Attendance & Absence Backend (Docker)
echo ========================================================
echo.
echo Starting PostgreSQL & Backend API containers...
echo.

docker compose up -d

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start Docker containers.
    echo Make sure Docker Desktop is running and try again.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo   Containers started successfully!
echo   Frontend App: http://localhost:8443
echo   API Server:   http://localhost:5000
echo   Swagger Docs: http://localhost:5000/api/docs
echo   Health Check: http://localhost:5000/health
echo ========================================================
echo.
echo Opening UniAbsence Frontend in your browser...
start http://localhost:8443
echo Opening Swagger documentation in your browser...
start http://localhost:5000/api/docs
echo.
pause
