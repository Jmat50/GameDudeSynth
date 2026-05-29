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

echo Building WarioSynthServer.exe...
python -m PyInstaller --noconfirm --clean server_gui.spec
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo Copying launcher to project root...
copy /Y "dist\WarioSynthServer.exe" "WarioSynthServer.exe" >nul
if errorlevel 1 (
  echo Warning: could not copy exe to project root. Use dist\WarioSynthServer.exe from the repo folder.
) else (
  echo Done: WarioSynthServer.exe ^(project root^) and dist\WarioSynthServer.exe
  echo Run WarioSynthServer.exe from this folder, then Start Server in the GUI.
)
echo.
pause
endlocal
