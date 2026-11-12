@echo off
setlocal
cd /d "%~dp0"
set "NODE_EXE=C:\Users\G3 3590\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" (
  where node >nul 2>nul
  if errorlevel 1 (
    echo Node.js not found.
    echo Update NODE_EXE in this file or install Node.js.
    pause
    exit /b 1
  )
  set "NODE_EXE=node"
)
echo Starting NBA project server...
echo Local:   http://127.0.0.1:4173
echo Auction: http://127.0.0.1:4173/auction.html
echo Keep this window open. Press Ctrl+C to stop.
"%NODE_EXE%" server.mjs
pause
