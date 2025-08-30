const jwt = require('jsonwebtoken');
const config = require('./config/config');

// Genera un token JWT valido per Mario Rossi (gestore)
function generateValidToken() {
    const user = {
        id_utente: 1,
        nome: 'Mario',
        cognome: 'Rossi',
        email: 'mario.rossi@email.com',
        ruolo: 'gestore',
        telefono: '3331112222'
    };

    const token = jwt.sign(
        user,
        config.jwt.secret,
        {
            expiresIn: '24h',
            audience: 'coworking-mio-users',
            issuer: 'coworking-mio'
        }
    );

    console.log('🔑 Token JWT generato:');
    console.log(token);
    console.log('\n📋 Copia questo token e incollalo nel localStorage del browser:');
    console.log('localStorage.setItem("authToken", "' + token + '");');
    console.log('\n🎯 Oppure fai login nuovamente per ottenere un token valido.');

    return token;
}

// Esegui la generazione
generateValidToken();



