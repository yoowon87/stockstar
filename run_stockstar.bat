@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python was not found in PATH.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found in PATH.
  pause
  exit /b 1
)

echo [1/4] Installing backend dependencies...
pushd "%BACKEND_DIR%"
python -m pip install -r requirements.txt
if errorlevel 1 (
  echo [ERROR] Backend dependency installation failed.
  popd
  pause
  exit /b 1
)
popd

echo [2/4] Installing frontend dependencies...
pushd "%FRONTEND_DIR%"
call npm install --legacy-peer-deps
if errorlevel 1 (
  echo [ERROR] Frontend dependency installation failed.
  popd
  pause
  exit /b 1
)
popd

echo [3/4] Starting backend server...
start "StockStar Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && uvicorn app.main:app --reload"

echo [4/4] Starting frontend server...
start "StockStar Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && call npm run dev"

echo.
echo StockStar is starting.
echo Frontend: http://localhost:5173
echo Backend docs: http://localhost:8000/docs
echo.
pause
