@echo off
REM Script per controllare e creare il database PostgreSQL 17
REM Verifica se esiste il database 'coworking' e lo crea se necessario

setlocal enabledelayedexpansion

REM Configurazione di default
set HOST=localhost
set PORT=5432
set USERNAME=postgres
set PASSWORD=postgres
set DATABASE_NAME=coworking

echo 🚀 Setup Database PostgreSQL 17
echo =================================
echo.

echo 📋 Configurazione:
echo    Host: %HOST%
echo    Port: %PORT%
echo    Username: %USERNAME%
echo    Database: %DATABASE_NAME%
echo.

REM Verifica se psql è disponibile
psql --version >nul 2>&1
if errorlevel 1 (
    echo ❌ psql non trovato nel PATH. Installa PostgreSQL 17 e aggiungi psql al PATH.
    echo.
    echo 📋 Download PostgreSQL 17: https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)

echo ✅ psql trovato nel sistema
echo.

REM Test connessione PostgreSQL
echo 🔍 Test connessione PostgreSQL...
set PGPASSWORD=%PASSWORD%
psql -h %HOST% -p %PORT% -U %USERNAME% -d postgres -c "SELECT version();" >nul 2>&1
if errorlevel 1 (
    echo ❌ Errore connessione PostgreSQL. Verifica:
    echo    - PostgreSQL 17 è installato e in esecuzione
    echo    - Credenziali corrette (username/password)
    echo    - Porta %PORT% è aperta
    echo.
    pause
    exit /b 1
)

echo ✅ Connessione PostgreSQL riuscita!
echo.

REM Controlla se il database esiste
echo 🔍 Controllo esistenza database '%DATABASE_NAME%'...
psql -h %HOST% -p %PORT% -U %USERNAME% -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname = '%DATABASE_NAME%';" > temp_check.txt 2>&1
set /p DB_EXISTS=<temp_check.txt
del temp_check.txt

if "%DB_EXISTS%"=="1" (
    echo ✅ Database '%DATABASE_NAME%' esiste già!
    echo.
    echo 🎉 Setup database completato!
    goto :end
) else (
    echo ⚠️ Database '%DATABASE_NAME%' non esiste.
    echo.
)

REM Crea il database
echo 🔨 Creazione database '%DATABASE_NAME%'...
psql -h %HOST% -p %PORT% -U %USERNAME% -d postgres -c "CREATE DATABASE %DATABASE_NAME%;" >nul 2>&1
if errorlevel 1 (
    echo ❌ Errore durante creazione database.
    echo.
    pause
    exit /b 1
)

echo ✅ Database '%DATABASE_NAME%' creato con successo!
echo.

REM Esegui lo schema se esiste
if exist "database\schema.sql" (
    echo 📋 Esecuzione schema database...
    psql -h %HOST% -p %PORT% -U %USERNAME% -d %DATABASE_NAME% -f database\schema.sql >nul 2>&1
    if errorlevel 1 (
        echo ❌ Errore durante esecuzione schema.
        echo.
    ) else (
        echo ✅ Schema database eseguito con successo!
        echo.
    )
) else (
    echo ⚠️ File schema.sql non trovato in database\
    echo 📝 Database creato ma senza schema. Esegui manualmente lo schema.
    echo.
)

REM Esegui i dati di seed se esistono
if exist "database\seed.sql" (
    echo 🌱 Esecuzione dati di seed...
    psql -h %HOST% -p %PORT% -U %USERNAME% -d %DATABASE_NAME% -f database\seed.sql >nul 2>&1
    if errorlevel 1 (
        echo ❌ Errore durante esecuzione seed.
        echo.
    ) else (
        echo ✅ Dati di seed eseguiti con successo!
        echo.
    )
) else (
    echo ⚠️ File seed.sql non trovato in database\
    echo 📝 Database pronto ma senza dati di esempio.
    echo.
)

:end
echo 🎉 Setup database completato!
echo.
echo 📋 Prossimi passi:
echo    1. Configura le variabili d'ambiente nel backend
echo    2. Avvia il server backend: npm start
echo    3. Testa la connessione con il frontend
echo.

REM Pulisci variabili d'ambiente
set PGPASSWORD=

pause



