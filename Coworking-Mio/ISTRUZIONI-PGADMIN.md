# 🗄️ ISTRUZIONI PER SINCRONIZZARE PGADMIN CON SUPABASE

## 📋 **VERIFICA COMPATIBILITÀ**

✅ **Database Supabase**: PostgreSQL 17.4 (funzionante)  
✅ **Database Locale**: PostgreSQL 17 (compatibile)  
✅ **Schema**: Identico tra Supabase e locale  
✅ **Tabelle**: 3 sedi presenti in produzione  

## 🚀 **PROCEDURA COMPLETA**

### **1. Apri pgAdmin**
- Avvia pgAdmin 4
- Connettiti al server PostgreSQL locale
- Seleziona il database `coworkspace`

### **2. Esegui Script di Sincronizzazione**
1. **Apri Query Tool** in pgAdmin
2. **Copia e incolla** il contenuto del file `sync-pgadmin-database.sql`
3. **Esegui lo script** (F5 o pulsante Execute)

### **3. Verifica Risultati**
Lo script mostrerà:
- ✅ Tabelle create
- ✅ Dati inseriti
- ✅ Conteggio record per tabella

## 🔑 **CREDENZIALI UTENTI**

### **Utente Normale**
- **Email**: `frabro@email.com`
- **Password**: `frabro19`
- **Ruolo**: Cliente

### **Gestore**
- **Email**: `ilmiobro@email.com`
- **Password**: `ilmiobro19`
- **Ruolo**: Gestore

## 📊 **STRUTTURA DATABASE**

### **Tabelle Principali**
- **Utente**: Gestione utenti e autenticazione
- **Sede**: Sedi coworking disponibili
- **Spazio**: Spazi all'interno delle sedi
- **Prenotazione**: Prenotazioni degli utenti
- **Pagamento**: Gestione pagamenti
- **Servizio**: Servizi disponibili
- **Spazio_Servizio**: Relazione many-to-many

### **Dati di Test Inclusi**
- ✅ 2 utenti (cliente + gestore)
- ✅ 3 sedi a Milano
- ✅ 10 spazi diversi
- ✅ 6 servizi disponibili

## 🔧 **OPZIONI AVANZATE**

### **Reset Completo Database**
Se vuoi cancellare tutto e ricominciare:
1. Decommenta la sezione "PULIZIA DATABASE ESISTENTE"
2. Esegui lo script
3. Ricommenta la sezione
4. Esegui di nuovo lo script

### **Solo Schema (Senza Dati)**
Se vuoi solo la struttura:
1. Salta la sezione "INSERIMENTO DATI DI TEST"
2. Esegui solo le CREATE TABLE

## 🐛 **RISOLUZIONE PROBLEMI**

### **Errore "Table Already Exists"**
- ✅ Normale se le tabelle esistono già
- Lo script usa `CREATE TABLE IF NOT EXISTS`

### **Errore "Duplicate Key"**
- ✅ Normale per i dati di test
- Lo script usa `ON CONFLICT DO NOTHING`

### **Errore Connessione**
- Verifica che PostgreSQL sia in esecuzione
- Controlla credenziali in pgAdmin
- Verifica che il database `coworkspace` esista

## ✅ **VERIFICA FINALE**

Dopo l'esecuzione, dovresti vedere:
```
tabella | count
--------|-------
Utenti  | 2
Sedi    | 3
Spazi   | 10
Servizi | 6
```

## 🎯 **PROSSIMI PASSI**

1. ✅ Database sincronizzato
2. 🚀 Avvia backend locale: `node start-local.js`
3. 🌐 Apri frontend: `index.html`
4. 🔑 Testa login con le credenziali sopra

## 📞 **SUPPORTO**

Se hai problemi:
1. Controlla i log di pgAdmin
2. Verifica la connessione PostgreSQL
3. Assicurati che il database `coworkspace` esista
4. Controlla i permessi utente postgres




