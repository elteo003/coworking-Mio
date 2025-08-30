Write-Host "🚀 Avvio ambiente di sviluppo locale completo..." -ForegroundColor Green
Write-Host ""

Write-Host "📋 Verifica prerequisiti..." -ForegroundColor Yellow
Write-Host "   - PostgreSQL 17 installato e in esecuzione"
Write-Host "   - Password postgres: postgres"
Write-Host "   - Database: coworkspace"
Write-Host "   - Node.js installato"
Write-Host "   - NPM installato"
Write-Host ""

Write-Host "🔧 Setup database locale..." -ForegroundColor Cyan
Set-Location backend
node setup-local-complete.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Errore durante setup database" -ForegroundColor Red
    Read-Host "Premi Enter per uscire"
    exit 1
}

Write-Host ""
Write-Host "🚀 Avvio backend locale..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node start-local.js"

Write-Host ""
Write-Host "⏳ Attendi 3 secondi per l'avvio del backend..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "🌐 Apri il frontend nel browser..." -ForegroundColor Cyan
$frontendPath = Join-Path $PSScriptRoot "frontend\public\index.html"
Write-Host "   URL: file:///$($frontendPath.Replace('\', '/'))"

Write-Host ""
Write-Host "📋 Credenziali utenti:" -ForegroundColor Magenta
Write-Host "   👤 Utente normale: frabro@email.com / frabro19"
Write-Host "   👨‍💼 Gestore: ilmiobro@email.com / ilmiobro19"

Write-Host ""
Write-Host "✅ Ambiente di sviluppo locale pronto!" -ForegroundColor Green
Write-Host "   Backend: http://localhost:3000"
Write-Host "   Frontend: Apri index.html nel browser"
Write-Host "   Database: PostgreSQL 17 - coworkspace"

Write-Host ""
Read-Host "Premi Enter per uscire"
