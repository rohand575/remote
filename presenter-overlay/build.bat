@echo off
echo ========================================
echo Building Live Reactions Presenter App
echo ========================================
echo.

cd /d "%~dp0"

echo Installing dependencies...
call npm install

echo.
echo Building Windows executable...
:: Disable code signing to avoid symlink permission issues
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npx electron-builder --win --x64 -c.win.signAndEditExecutable=false

echo.
echo ========================================
echo Build complete!
echo.
echo Your executable files are in the 'dist' folder:
echo   - "Live Reactions 1.0.0.exe" (Portable - just double-click to run)
echo   - "Live Reactions Setup 1.0.0.exe" (Installer)
echo ========================================
explorer dist
pause
