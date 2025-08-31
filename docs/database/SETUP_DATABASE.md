# 🔧 Setup Database per Test Prenotazioni

## 📋 Prerequisiti

Lo script usa le variabili d'ambiente già configurate nel progetto. Le credenziali del database Supabase sono già impostate e funzionano sia in locale che su Render.

## 🚀 Come Eseguire

### In Locale

Imposta la variabile d'ambiente `DATABASE_URL` con le tue credenziali Supabase:

```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://postgres.czkiuvmhijhxuqzdtnmz:mammaketty74!@aws-0-eu-north-1.pooler.supabase.com:6543/postgres"

# Windows CMD
set DATABASE_URL=postgresql://postgres.czkiuvmhijhxuqzdtnmz:mammaketty74!@aws-0-eu-north-1.pooler.supabase.com:6543/postgres

# Linux/Mac
export DATABASE_URL="postgresql://postgres.czkiuvmhijhxuqzdtnmz:mammaketty74!@aws-0-eu-north-1.pooler.supabase.com:6543/postgres"
```

### Su Render

Le variabili d'ambiente sono già configurate automaticamente su Render.

## 🎯 Credenziali Database

Le credenziali del database Supabase sono già configurate:

```
DATABASE_URL=postgresql://postgres.czkiuvmhijhxuqzdtnmz:mammaketty74!@aws-0-eu-north-1.pooler.supabase.com:6543/postgres
```

## ▶️ Esecuzione

### In Locale

```bash
# Imposta la variabile d'ambiente
$env:DATABASE_URL="postgresql://postgres.czkiuvmhijhxuqzdtnmz:mammaketty74!@aws-0-eu-north-1.pooler.supabase.com:6543/postgres"

# Esegui lo script
cd backend
node test-prenotazioni-settembre.js
```

### Su Render

Lo script può essere eseguito direttamente su Render usando le variabili d'ambiente già configurate.

## 📊 Cosa Fa lo Script

- Pulisce le prenotazioni esistenti per settembre 2025
- Crea 30+ prenotazioni di test per la prima settimana di settembre
- Distribuisce le prenotazioni su 7 giorni
- Usa 3 utenti di test (ID: 1, 2, 3)
- Usa 2 spazi di test (ID: 1, 2)
- Mostra un riepilogo delle prenotazioni create

## ✅ Verifica

Dopo l'esecuzione, puoi testare la pagina `selezione-slot.html` con dati reali!
