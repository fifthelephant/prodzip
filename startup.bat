@echo off
setlocal
cd /d "%~dp0" || exit /b 1

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required. Install it from https://nodejs.org and run this file again.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is required and is included with Node.js. Install Node.js from https://nodejs.org.
  exit /b 1
)

for /f %%V in ('node -p "process.versions.node.split('.')[0]"') do set "NODE_MAJOR=%%V"
if not defined NODE_MAJOR (
  echo Could not determine the installed Node.js version.
  exit /b 1
)
if %NODE_MAJOR% LSS 20 (
  echo Node.js 20 or newer is required. Found:
  node --version
  exit /b 1
)

echo Installing dependencies...
call npm install
if errorlevel 1 goto failed

echo Building the website...
call npm run build
if errorlevel 1 goto failed

echo Marwadi Khana is available at http://localhost:3000
call npx next start -p 3000
exit /b %ERRORLEVEL%

:failed
echo Startup failed. Review the error above and try again.
exit /b 1
