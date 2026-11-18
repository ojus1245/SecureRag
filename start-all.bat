@echo off
title Secure RAG - Service Launcher
echo ===================================================
echo   Starting Secure Enterprise RAG Knowledge Base
echo ===================================================
echo.

echo [1/3] Starting AI Service on port 8000 (Gemini 3.5 Flash Lite)...
start "AI Service (Port 8000)" cmd /k "cd /d %~dp0ai-service && .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Backend Server on port 5000...
start "Backend Server (Port 5000)" cmd /k "cd /d %~dp0backend && node src/server.js"

timeout /t 2 /nobreak >nul

echo [3/3] Starting Frontend Dev Server on port 3000...
start "Frontend (Port 3000)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo   All 3 services have been launched!
echo ===================================================
echo - Frontend:    http://localhost:3000
echo - Backend:     http://localhost:5000
echo - AI Service:  http://localhost:8000
echo.
echo Admin Login:
echo - Email:       admin@securerag.com
echo - Password:    Admin@123456
echo ===================================================
pause

