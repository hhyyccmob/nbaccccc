@echo off
setlocal
robocopy "%~dp0" "D:\nba" /E /R:1 /W:1 /XF bundle-theme.mjs bundle-theme-auction.mjs
echo.
echo Sync finished. Exit code %ERRORLEVEL% (0-7 means success).
start "" "D:\nba"
pause
