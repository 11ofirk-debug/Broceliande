@echo off
rem Double-click to pull the published Google Sheet into data\*.csv (M2j section 5).
cd /d "%~dp0"
py -3 --version >nul 2>nul
if %errorlevel%==0 (
  py -3 pull_sheet.py
) else (
  python pull_sheet.py
)
echo.
pause
