@echo off
title University Attendance API - Seed Database
cd /d "%~dp0"

echo ========================================================
echo   Seeding University Attendance Database via Docker...
echo ========================================================
echo.

docker compose exec api npx tsx prisma/seed.ts

echo.
echo Database seeding finished.
pause
