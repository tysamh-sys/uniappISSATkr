@echo off
title University Attendance API - Stop Docker
cd /d "%~dp0"

echo ========================================================
echo   Stopping University Attendance Containers...
echo ========================================================
echo.

docker compose down

echo.
echo Containers stopped successfully.
pause
