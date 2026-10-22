@echo off
title UniAbsence Server
cd /d "%~dp0"

echo ===================================================
echo               UniAbsence Application
echo ===================================================
echo.
echo Starting development server on http://localhost:8443 ...
echo.

start http://localhost:8443
npm run dev

pause
