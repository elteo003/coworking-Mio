const request = require('supertest');
const { app } = require('../src/app');
const pool = require('../src/db');

describe('API Prenotazioni', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/prenotazioni', () => {
    it('dovrebbe creare una nuova prenotazione', async () => {
      const mockPrenotazione = {
        id_prenotazione: 1,
        id_utente: 1,
        id_spazio: 1,
        data_inizio: '2024-01-15T10:00:00Z',
        data_fine: '2024-01-15T12:00:00Z',
        stato: 'in attesa'
      };

      // Mock per verificare disponibilità spazio
      pool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id_spazio: 1, nome: 'Sala Meeting 1' }]
      });

      // Mock per inserimento prenotazione
      pool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id_prenotazione: 1 }]
      });

      const response = await request(app)
        .post('/api/prenotazioni')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          id_spazio: 1,
          data_inizio: '2024-01-15T10:00:00Z',
          data_fine: '2024-01-15T12:00:00Z'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('id_prenotazione');
    });

    it('dovrebbe restituire errore con dati mancanti', async () => {
      const response = await request(app)
        .post('/api/prenotazioni')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          id_spazio: 1
          // data_inizio e data_fine mancanti
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('dovrebbe restituire errore se spazio non esiste', async () => {
      pool.query.mockResolvedValueOnce({
        rowCount: 0,
        rows: []
      });

      const response = await request(app)
        .post('/api/prenotazioni')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          id_spazio: 999,
          data_inizio: '2024-01-15T10:00:00Z',
          data_fine: '2024-01-15T12:00:00Z'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/prenotazioni', () => {
    it('dovrebbe restituire le prenotazioni dell\'utente', async () => {
      const mockPrenotazioni = [
        {
          id_prenotazione: 1,
          id_spazio: 1,
          data_inizio: '2024-01-15T10:00:00Z',
          data_fine: '2024-01-15T12:00:00Z',
          stato: 'confermata',
          nome_spazio: 'Sala Meeting 1',
          nome_sede: 'Sede Centrale'
        }
      ];

      pool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: mockPrenotazioni
      });

      const response = await request(app)
        .get('/api/prenotazioni?utente=1')
        .set('Authorization', 'Bearer mock-jwt-token');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('id_prenotazione');
    });

    it('dovrebbe restituire errore senza parametri', async () => {
      const response = await request(app)
        .get('/api/prenotazioni')
        .set('Authorization', 'Bearer mock-jwt-token');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/prenotazioni/:id', () => {
    it('dovrebbe aggiornare una prenotazione esistente', async () => {
      const mockUpdatedPrenotazione = {
        id_prenotazione: 1,
        stato: 'confermata'
      };

      pool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [mockUpdatedPrenotazione]
      });

      const response = await request(app)
        .put('/api/prenotazioni/1')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          stato: 'confermata'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('dovrebbe restituire errore se prenotazione non esiste', async () => {
      pool.query.mockResolvedValueOnce({
        rowCount: 0,
        rows: []
      });

      const response = await request(app)
        .put('/api/prenotazioni/999')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          stato: 'confermata'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/prenotazioni/:id', () => {
    it('dovrebbe cancellare una prenotazione esistente', async () => {
      pool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: []
      });

      const response = await request(app)
        .delete('/api/prenotazioni/1')
        .set('Authorization', 'Bearer mock-jwt-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('dovrebbe restituire errore se prenotazione non esiste', async () => {
      pool.query.mockResolvedValueOnce({
        rowCount: 0,
        rows: []
      });

      const response = await request(app)
        .delete('/api/prenotazioni/999')
        .set('Authorization', 'Bearer mock-jwt-token');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});
