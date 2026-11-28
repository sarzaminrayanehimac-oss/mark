@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   MARK online server  (close this window to stop it)
echo ============================================
node server.js 8080
pause
