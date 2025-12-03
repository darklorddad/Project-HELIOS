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
set "VERSION_FILE=%~dp0.aider_version"
set "PREV_VERSION="
if exist "%VERSION_FILE%" (
    set /p PREV_VERSION=<"%VERSION_FILE%"
)

echo.
echo ========================================================
echo  Input Aider Version
echo ========================================================
if defined PREV_VERSION (
    echo Previous version: %PREV_VERSION%
    echo Please enter the version number ^(or press Enter to use %PREV_VERSION%^)
) else (
    echo Please enter the version number ^(e.g. 0.86.1^)
)
echo.
set "USER_VERSION="
set /p USER_VERSION="Enter Version Number: "

if "%USER_VERSION%"=="" set "USER_VERSION=%PREV_VERSION%"

if "%USER_VERSION%"=="" (
    echo [ERROR] Version cannot be empty.
    pause
    exit /b 1
)

(echo %USER_VERSION%) > "%VERSION_FILE%"

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

:: FIX: Downgrade tree-sitter and swap language packs for compatibility
echo Fixing tree-sitter environment...
"%VENV_DIR%\Scripts\python.exe" -m pip uninstall -y tree-sitter
"%VENV_DIR%\Scripts\python.exe" -m pip install tree-sitter==0.24.0

:: ---------------------------------------------------------
:: 6. Create Shortcut
:: ---------------------------------------------------------
echo.
echo Creating 'aider.bat' shortcut in root...
(
    echo @echo off
    echo "%VENV_DIR%\Scripts\aider.exe" %%* --model openrouter/google/gemini-3-pro-preview --edit-format diff-fenced --chat-language British-English --cache-prompt --no-stream --no-attribute-author --no-attribute-committer --no-attribute-co-authored-by --add-gitignore-files --timeout 60 --multiline --dark-mode --check-update --analytics-disable --read CONVENTIONS.md
) > "%~dp0engine.bat"

echo.
echo ========================================================
echo  SUCCESS! 
echo  Run 'aider' to start.
echo ========================================================
echo.
pause
