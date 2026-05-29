@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found on PATH.
  echo Install Python 3 and ensure "python" is available in Command Prompt.
  pause
  exit /b 1
)

python "server_gui.py"
if errorlevel 1 (
  echo.
  echo Failed to launch server_gui.py.
  pause
  exit /b 1
)

endlocal
