const request = require('supertest');
const { app } = require('../src/app');

describe('Test Semplificati API', () => {
  
  test('GET /api/ping dovrebbe restituire pong', async () => {
    const response = await request(app)
      .get('/api/ping');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'pong');
  });

  test('GET /api/test-cors dovrebbe funzionare', async () => {
    const response = await request(app)
      .get('/api/test-cors');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'CORS test successful');
  });

  test('GET /api/test-auth dovrebbe funzionare', async () => {
    const response = await request(app)
      .get('/api/test-auth');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Test autenticazione');
  });

  test('GET /api/test-spazi dovrebbe funzionare', async () => {
    const response = await request(app)
      .get('/api/test-spazi');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Route spazi test successful');
  });

  test('GET /api/test-disponibilita dovrebbe funzionare', async () => {
    const response = await request(app)
      .get('/api/test-disponibilita?data_inizio=2024-01-15&data_fine=2024-01-15');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Test disponibilità senza auth');
  });

});
