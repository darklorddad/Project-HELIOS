@echo off
setlocal

:: ---------------------------------------------------------
:: Configuration
:: ---------------------------------------------------------
set "ENGINE_DIR=engine"
set "VENV_DIR=%~dp0%ENGINE_DIR%\venv"

:: ---------------------------------------------------------
:: 1. Checks
:: ---------------------------------------------------------
echo [1/5] Checking directory structure...
if not exist "%~dp0%ENGINE_DIR%\pyproject.toml" (
    echo [ERROR] Could not find '%ENGINE_DIR%\pyproject.toml'.
    echo Please run this script from the repository root.
    pause
    exit /b 1
)

:: ---------------------------------------------------------
:: 2. Ask User for Version Number
:: ---------------------------------------------------------
echo.
echo ========================================================
echo  Input Aider Version
echo ========================================================
echo Please enter the version number (e.g. 0.86.1)
echo.
set /p USER_VERSION="Enter Version Number: "

if "%USER_VERSION%"=="" (
    echo [ERROR] Version cannot be empty.
    pause
    exit /b 1
)

:: Set the environment variable to prevent crash
set "SETUPTOOLS_SCM_PRETEND_VERSION_FOR_AIDER_CHAT=%USER_VERSION%"

:: ---------------------------------------------------------
:: 3. Create Virtual Environment
:: ---------------------------------------------------------
echo.
echo [3/5] Setting up Virtual Environment...
if not exist "%VENV_DIR%" (
    python -m venv "%VENV_DIR%"
)

:: ---------------------------------------------------------
:: 4. Upgrade Pip
:: ---------------------------------------------------------
echo [4/5] Upgrading pip...
"%VENV_DIR%\Scripts\python.exe" -m pip install --upgrade pip >nul 2>&1

:: ---------------------------------------------------------
:: 5. Install Aider
:: ---------------------------------------------------------
echo [5/5] Installing Aider (Version: %USER_VERSION%)...

:: FIX: We use python -m pip and absolute paths to prevent "Path not found" errors
"%VENV_DIR%\Scripts\python.exe" -m pip install -e "%~dp0%ENGINE_DIR%"

if %errorlevel% neq 0 (
    echo.
    echo [FAIL] Installation failed.
    pause
    exit /b 1
)

:: FIX: Downgrade tree-sitter to version compatible with repomap.py
echo Fixing tree-sitter version...
"%VENV_DIR%\Scripts\python.exe" -m pip install tree-sitter==0.21.3

:: ---------------------------------------------------------
:: 6. Create Shortcut
:: ---------------------------------------------------------
echo.
echo Creating 'aider.bat' shortcut in root...
(
    echo @echo off
    echo "%VENV_DIR%\Scripts\aider.exe" %%*
) > "%~dp0engine.bat"

echo.
echo ========================================================
echo  SUCCESS! 
echo  Run 'aider' to start.
echo ========================================================
echo.
pause
