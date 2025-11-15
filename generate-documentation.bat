@echo off
title Smart Home Documentation Generator
color 0A

echo.
echo ========================================
echo   Smart Home Documentation Generator
echo ========================================
echo.

echo [1] Converting Markdown to DOCX...
echo.

REM Check if pandoc is available
pandoc --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Pandoc not found. Installing...
    winget install --id JohnMacFarlane.Pandoc
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Pandoc automatically.
        echo Please install Pandoc manually from: https://pandoc.org/installing.html
        echo.
        echo Alternative installation methods:
        echo - Using Chocolatey: choco install pandoc
        echo - Using Scoop: scoop install pandoc
        echo.
        pause
        exit /b 1
    )
)

REM Convert the documentation
echo [2] Converting documentation...
pandoc "Smart_Home_Automation_Documentation.md" -o "Smart_Home_Automation_System_Guide.docx" --from markdown --to docx

if exist "Smart_Home_Automation_System_Guide.docx" (
    echo.
    echo [SUCCESS] Document created successfully!
    echo.
    echo File: Smart_Home_Automation_System_Guide.docx
    echo Location: %CD%
    echo.
    echo The document includes:
    echo - Complete system overview
    echo - Dashboard features explanation  
    echo - Device management guide
    echo - Analytics and graphs documentation
    echo - Auto-off system details
    echo - Energy calculation formulas
    echo - Mobile support information
    echo - Demo mode instructions
    echo - Technical architecture
    echo.
    
    set /p openfile="Would you like to open the document now? (y/n): "
    if /i "%openfile%"=="y" start "Smart_Home_Automation_System_Guide.docx"
    
    echo.
    echo Document is ready to share with guests!
) else (
    echo [ERROR] Failed to create DOCX file.
    echo Please check if pandoc is properly installed.
)

echo.
pause