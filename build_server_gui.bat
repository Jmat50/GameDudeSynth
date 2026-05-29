@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found on PATH.
  pause
  exit /b 1
)

echo Installing PyInstaller if needed...
python -m pip install pyinstaller --quiet
if errorlevel 1 (
  echo Failed to install PyInstaller.
  pause
  exit /b 1
)

echo Building GameDudeSynthServer.exe...
python -m PyInstaller --noconfirm --clean server_gui.spec
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo Copying launcher to project root...
copy /Y "dist\GameDudeSynthServer.exe" "GameDudeSynthServer.exe" >nul
if errorlevel 1 (
  echo Warning: could not copy exe to project root. Use dist\GameDudeSynthServer.exe from the repo folder.
) else (
  echo Done: GameDudeSynthServer.exe ^(project root^) and dist\GameDudeSynthServer.exe
  echo Run GameDudeSynthServer.exe from this folder, then Start Server in the GUI.
)
echo.
pause
endlocal
