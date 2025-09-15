const request = require('supertest');
const { app } = require('../src/app');
const pool = require('../src/db');
const jwt = require('jsonwebtoken');

describe('API Autenticazione', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('dovrebbe fare login con credenziali valide', async () => {
      const mockUser = {
        id_utente: 1,
        email: 'test@example.com',
        nome: 'Test',
        cognome: 'User',
        ruolo: 'cliente'
      };

      pool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [mockUser]
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('dovrebbe restituire errore con credenziali non valide', async () => {
      pool.query.mockResolvedValueOnce({
        rowCount: 0,
        rows: []
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('dovrebbe restituire errore con dati mancanti', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
          // password mancante
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/register', () => {
    it('dovrebbe registrare un nuovo utente', async () => {
      const mockNewUser = {
        id_utente: 2,
        email: 'newuser@example.com',
        nome: 'New',
        cognome: 'User',
        ruolo: 'cliente'
      };

      // Mock per verificare se l'email esiste già
      pool.query.mockResolvedValueOnce({
        rowCount: 0,
        rows: []
      });

      // Mock per l'inserimento del nuovo utente
      pool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [mockNewUser]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          nome: 'New',
          cognome: 'User'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
    });

    it('dovrebbe restituire errore se email già esistente', async () => {
      pool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id_utente: 1 }]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          nome: 'Existing',
          cognome: 'User'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    it('dovrebbe restituire i dati dell\'utente autenticato', async () => {
      const mockUser = {
        id_utente: 1,
        email: 'test@example.com',
        nome: 'Test',
        cognome: 'User',
        ruolo: 'cliente'
      };

      pool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [mockUser]
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer mock-jwt-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('dovrebbe restituire errore senza token di autorizzazione', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
