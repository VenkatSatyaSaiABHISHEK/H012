# PowerShell script to convert Markdown to DOCX
# This script requires pandoc to be installed

Write-Host "🏠 Smart Home Documentation Converter" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if pandoc is installed
try {
    $pandocVersion = pandoc --version
    Write-Host "✅ Pandoc found!" -ForegroundColor Green
} catch {
    Write-Host "❌ Pandoc not found. Installing via winget..." -ForegroundColor Yellow
    try {
        winget install --id JohnMacFarlane.Pandoc
        Write-Host "✅ Pandoc installed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to install Pandoc. Please install manually from: https://pandoc.org/installing.html" -ForegroundColor Red
        Write-Host "Alternative: Use 'choco install pandoc' if you have Chocolatey" -ForegroundColor Yellow
        exit 1
    }
}

# Convert Markdown to DOCX
$inputFile = "Smart_Home_Automation_Documentation.md"
$outputFile = "Smart_Home_Automation_System_Guide.docx"

Write-Host "📄 Converting $inputFile to $outputFile..." -ForegroundColor Cyan

try {
    # Convert with enhanced formatting
    pandoc $inputFile -o $outputFile --from markdown --to docx --reference-doc=template.docx 2>$null
    
    if (-not $?) {
        # Fallback conversion without template
        pandoc $inputFile -o $outputFile --from markdown --to docx
    }
    
    if (Test-Path $outputFile) {
        Write-Host "✅ Successfully created: $outputFile" -ForegroundColor Green
        Write-Host "📁 File location: $(Get-Location)\$outputFile" -ForegroundColor Cyan
        
        # Get file size
        $fileSize = (Get-Item $outputFile).Length
        $fileSizeKB = [math]::Round($fileSize / 1KB, 2)
        Write-Host "📊 File size: $fileSizeKB KB" -ForegroundColor Cyan
        
        # Ask if user wants to open the file
        $openFile = Read-Host "Would you like to open the document now? (y/n)"
        if ($openFile -eq 'y' -or $openFile -eq 'Y') {
            Start-Process $outputFile
        }
        
        Write-Host "🎉 Document ready for sharing with guests!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create DOCX file" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error during conversion: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n📋 Document includes:" -ForegroundColor Yellow
Write-Host "   • Complete system overview" -ForegroundColor White
Write-Host "   • Dashboard feature explanations" -ForegroundColor White
Write-Host "   • Device management guide" -ForegroundColor White
Write-Host "   • Analytics and graphs documentation" -ForegroundColor White
Write-Host "   • Auto-off system details" -ForegroundColor White
Write-Host "   • Energy calculation formulas" -ForegroundColor White
Write-Host "   • Mobile support information" -ForegroundColor White
Write-Host "   • Demo mode instructions" -ForegroundColor White
Write-Host "   • Technical architecture overview" -ForegroundColor White

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")