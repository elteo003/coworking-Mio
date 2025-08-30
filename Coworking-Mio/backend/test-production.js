#!/usr/bin/env node

/**
 * Script per testare la configurazione di produzione
 * Esegui: node test-production.js
 */

const https = require('https');

const BASE_URL = 'https://coworking-mio-1-backend.onrender.com';

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'coworking-mio-1-backend.onrender.com',
            port: 443,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Production-Test-Script'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const jsonBody = body ? JSON.parse(body) : {};
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: jsonBody
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testProduction() {
    console.log('🧪 Test configurazione produzione...');
    console.log(`🔗 URL Base: ${BASE_URL}`);

    const tests = [
        {
            name: 'Ping Server',
            path: '/api/ping',
            method: 'GET'
        },
        {
            name: 'Test Database Connection',
            path: '/api/debug/db-test',
            method: 'GET'
        },
        {
            name: 'Test Sedi Query',
            path: '/api/debug/sedi-test',
            method: 'GET'
        },
        {
            name: 'Test CORS',
            path: '/api/test-cors',
            method: 'GET'
        },
        {
            name: 'Test Login (dovrebbe fallire con credenziali sbagliate)',
            path: '/api/login',
            method: 'POST',
            data: { email: 'test@test.com', password: 'wrongpassword' }
        }
    ];

    for (const test of tests) {
        try {
            console.log(`\n🔍 Test: ${test.name}`);
            const result = await makeRequest(test.path, test.method, test.data);

            if (result.status === 200) {
                console.log(`✅ ${test.name}: OK (${result.status})`);
                if (test.path === '/api/ping') {
                    console.log(`   Risposta: ${result.body.message}`);
                }
            } else if (result.status === 401 && test.path === '/api/login') {
                console.log(`✅ ${test.name}: OK (${result.status}) - Login rifiutato come previsto`);
            } else if (result.status === 500) {
                console.log(`❌ ${test.name}: ERRORE 500`);
                console.log(`   Dettagli: ${JSON.stringify(result.body, null, 2)}`);
            } else {
                console.log(`⚠️ ${test.name}: Status ${result.status}`);
                console.log(`   Risposta: ${JSON.stringify(result.body, null, 2)}`);
            }
        } catch (error) {
            console.log(`❌ ${test.name}: ERRORE`);
            console.log(`   Errore: ${error.message}`);
        }
    }

    console.log('\n📋 Riepilogo:');
    console.log('✅ Se solo il ping funziona, il problema è nel database');
    console.log('✅ Se tutti i test falliscono, il problema è nella configurazione generale');
    console.log('✅ Se il login restituisce 401, il database funziona ma le credenziali sono sbagliate');
}

// Esegui test
testProduction();

