@echo off
echo 🚀 Avvio ambiente di sviluppo locale completo...
echo.

echo 📋 Verifica prerequisiti...
echo    - PostgreSQL installato e in esecuzione
echo    - Node.js installato
echo    - NPM installato
echo.

echo 🔧 Setup database locale...
cd backend
node setup-local-complete.js
if %errorlevel% neq 0 (
    echo ❌ Errore durante setup database
    pause
    exit /b 1
)

echo.
echo 🚀 Avvio backend locale...
start "Backend Local" cmd /k "node start-local.js"

echo.
echo ⏳ Attendi 3 secondi per l'avvio del backend...
timeout /t 3 /nobreak >nul

echo.
echo 🌐 Apri il frontend nel browser...
echo    URL: file:///%CD%/frontend/public/index.html
echo.

echo 📋 Credenziali utenti:
echo    👤 Utente normale: frabro@email.com / frabro19
echo    👨‍💼 Gestore: ilmiobro@email.com / ilmiobro19
echo.

echo ✅ Ambiente di sviluppo locale pronto!
echo    Backend: http://localhost:3000
echo    Frontend: Apri index.html nel browser
echo.

pause



