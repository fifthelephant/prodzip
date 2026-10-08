@echo off
setlocal EnableDelayedExpansion
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

call :free_port_3000
if errorlevel 1 goto failed

echo Installing dependencies...
call npm install
if errorlevel 1 goto failed

echo Building the website...
call npm run build
if errorlevel 1 goto failed

call :free_port_3000
if errorlevel 1 goto failed

echo Marwadi Khana is available at http://localhost:3000
call npx next start -p 3000
if errorlevel 1 (
  echo Server failed to start. Freeing port 3000 and retrying once...
  call :free_port_3000
  if errorlevel 1 goto failed
  call npx next start -p 3000
)
exit /b %ERRORLEVEL%

:failed
echo Startup failed. Review the error above and try again.
exit /b 1

:free_port_3000
echo Checking port 3000...
set /a "_tries=0"
:free_port_3000_retry
set "_pid="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /C:"LISTENING" ^| findstr /C:":3000 "') do (
  if not "%%P"=="0" set "_pid=%%P"
)
if not defined _pid (
  echo Port 3000 is available.
  exit /b 0
)

set /a "_tries+=1"
if !_tries! GTR 20 (
  echo Could not free port 3000. Process !_pid! is still using it.
  echo Close that process in Task Manager and run this file again.
  exit /b 1
)

echo Port 3000 is in use by process !_pid!. Stopping it...
taskkill /F /T /PID !_pid! >nul 2>&1
ping -n 2 127.0.0.1 >nul
goto free_port_3000_retry
