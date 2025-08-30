# Script per controllare e creare il database PostgreSQL 17
# Verifica se esiste il database 'coworking' e lo crea se necessario

param(
    [string]$Host = "localhost",
    [int]$Port = 5432,
    [string]$Username = "postgres",
    [string]$Password = "postgres",
    [string]$DatabaseName = "coworking"
)

Write-Host "🚀 Setup Database PostgreSQL 17" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Funzione per testare la connessione a PostgreSQL
function Test-PostgreSQLConnection {
    param($Host, $Port, $Username, $Password, $Database = "postgres")
    
    try {
        Write-Host "🔍 Test connessione PostgreSQL..." -ForegroundColor Cyan
        
        # Crea stringa di connessione
        $connectionString = "Server=$Host;Port=$Port;Database=$Database;User Id=$Username;Password=$Password;"
        
        # Test connessione usando psql se disponibile
        $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
        if ($psqlPath) {
            $env:PGPASSWORD = $Password
            $result = & psql -h $Host -p $Port -U $Username -d $Database -c "SELECT version();" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Connessione PostgreSQL riuscita!" -ForegroundColor Green
                Write-Host "📋 Versione: $($result[1])" -ForegroundColor White
                return $true
            }
            else {
                Write-Host "❌ Errore connessione PostgreSQL: $result" -ForegroundColor Red
                return $false
            }
        }
        else {
            Write-Host "⚠️ psql non trovato nel PATH. Tentativo con PowerShell..." -ForegroundColor Yellow
            
            # Fallback: usa .NET per testare la connessione
            try {
                Add-Type -AssemblyName System.Data
                $connection = New-Object System.Data.Odbc.OdbcConnection
                $connection.ConnectionString = "Driver={PostgreSQL ODBC Driver(UNICODE)};Server=$Host;Port=$Port;Database=$Database;Uid=$Username;Pwd=$Password;"
                $connection.Open()
                $connection.Close()
                Write-Host "✅ Connessione PostgreSQL riuscita!" -ForegroundColor Green
                return $true
            }
            catch {
                Write-Host "❌ Errore connessione PostgreSQL: $($_.Exception.Message)" -ForegroundColor Red
                return $false
            }
        }
    }
    catch {
        Write-Host "❌ Errore durante test connessione: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Funzione per controllare se il database esiste
function Test-DatabaseExists {
    param($Host, $Port, $Username, $Password, $DatabaseName)
    
    try {
        Write-Host "🔍 Controllo esistenza database '$DatabaseName'..." -ForegroundColor Cyan
        
        $env:PGPASSWORD = $Password
        $result = & psql -h $Host -p $Port -U $Username -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName';" 2>&1
        
        if ($LASTEXITCODE -eq 0 -and $result.Trim() -eq "1") {
            Write-Host "✅ Database '$DatabaseName' esiste già!" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "⚠️ Database '$DatabaseName' non esiste." -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "❌ Errore durante controllo database: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Funzione per creare il database
function New-Database {
    param($Host, $Port, $Username, $Password, $DatabaseName)
    
    try {
        Write-Host "🔨 Creazione database '$DatabaseName'..." -ForegroundColor Cyan
        
        $env:PGPASSWORD = $Password
        $result = & psql -h $Host -p $Port -U $Username -d postgres -c "CREATE DATABASE $DatabaseName;" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database '$DatabaseName' creato con successo!" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "❌ Errore durante creazione database: $result" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Errore durante creazione database: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Funzione per eseguire lo schema SQL
function Invoke-DatabaseSchema {
    param($Host, $Port, $Username, $Password, $DatabaseName)
    
    try {
        Write-Host "📋 Esecuzione schema database..." -ForegroundColor Cyan
        
        $schemaFile = "database/schema.sql"
        if (Test-Path $schemaFile) {
            $env:PGPASSWORD = $Password
            $result = & psql -h $Host -p $Port -U $Username -d $DatabaseName -f $schemaFile 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Schema database eseguito con successo!" -ForegroundColor Green
                return $true
            }
            else {
                Write-Host "❌ Errore durante esecuzione schema: $result" -ForegroundColor Red
                return $false
            }
        }
        else {
            Write-Host "⚠️ File schema.sql non trovato in database/" -ForegroundColor Yellow
            Write-Host "📝 Database creato ma senza schema. Esegui manualmente lo schema." -ForegroundColor White
            return $true
        }
    }
    catch {
        Write-Host "❌ Errore durante esecuzione schema: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Funzione per eseguire i dati di seed
function Invoke-DatabaseSeed {
    param($Host, $Port, $Username, $Password, $DatabaseName)
    
    try {
        Write-Host "🌱 Esecuzione dati di seed..." -ForegroundColor Cyan
        
        $seedFile = "database/seed.sql"
        if (Test-Path $seedFile) {
            $env:PGPASSWORD = $Password
            $result = & psql -h $Host -p $Port -U $Username -d $DatabaseName -f $seedFile 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Dati di seed eseguiti con successo!" -ForegroundColor Green
                return $true
            }
            else {
                Write-Host "❌ Errore durante esecuzione seed: $result" -ForegroundColor Red
                return $false
            }
        }
        else {
            Write-Host "⚠️ File seed.sql non trovato in database/" -ForegroundColor Yellow
            Write-Host "📝 Database pronto ma senza dati di esempio." -ForegroundColor White
            return $true
        }
    }
    catch {
        Write-Host "❌ Errore durante esecuzione seed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# MAIN EXECUTION
Write-Host "📋 Configurazione:" -ForegroundColor White
Write-Host "   Host: $Host" -ForegroundColor Gray
Write-Host "   Port: $Port" -ForegroundColor Gray
Write-Host "   Username: $Username" -ForegroundColor Gray
Write-Host "   Database: $DatabaseName" -ForegroundColor Gray
Write-Host ""

# Step 1: Test connessione PostgreSQL
if (-not (Test-PostgreSQLConnection -Host $Host -Port $Port -Username $Username -Password $Password)) {
    Write-Host "❌ Impossibile connettersi a PostgreSQL. Verifica:" -ForegroundColor Red
    Write-Host "   - PostgreSQL 17 è installato e in esecuzione" -ForegroundColor White
    Write-Host "   - Credenziali corrette (username/password)" -ForegroundColor White
    Write-Host "   - Porta $Port è aperta" -ForegroundColor White
    Write-Host "   - psql è nel PATH" -ForegroundColor White
    exit 1
}

# Step 2: Controlla se il database esiste
$databaseExists = Test-DatabaseExists -Host $Host -Port $Port -Username $Username -Password $Password -DatabaseName $DatabaseName

# Step 3: Crea il database se non esiste
if (-not $databaseExists) {
    if (New-Database -Host $Host -Port $Port -Username $Username -Password $Password -DatabaseName $DatabaseName) {
        Write-Host ""
        Write-Host "🎯 Database '$DatabaseName' creato! Procedo con lo schema..." -ForegroundColor Green
        
        # Step 4: Esegui lo schema
        if (Invoke-DatabaseSchema -Host $Host -Port $Port -Username $Username -Password $Password -DatabaseName $DatabaseName) {
            Write-Host ""
            Write-Host "🎯 Schema eseguito! Procedo con i dati di seed..." -ForegroundColor Green
            
            # Step 5: Esegui i dati di seed
            Invoke-DatabaseSeed -Host $Host -Port $Port -Username $Username -Password $Password -DatabaseName $DatabaseName
        }
    }
    else {
        Write-Host "❌ Impossibile creare il database." -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host ""
    Write-Host "✅ Database '$DatabaseName' già esistente. Setup completato!" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Setup database completato!" -ForegroundColor Green
Write-Host "📋 Prossimi passi:" -ForegroundColor White
Write-Host "   1. Configura le variabili d'ambiente nel backend" -ForegroundColor Gray
Write-Host "   2. Avvia il server backend: npm start" -ForegroundColor Gray
Write-Host "   3. Testa la connessione con il frontend" -ForegroundColor Gray
Write-Host ""

# Pulisci variabili d'ambiente
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue



