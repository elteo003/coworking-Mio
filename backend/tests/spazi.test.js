const request = require('supertest');
const { app } = require('../src/app');
const pool = require('../src/db');

describe('API Spazi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/spazi', () => {
    it('dovrebbe restituire la lista degli spazi', async () => {
      const mockSpazi = [
        {
          id_spazio: 1,
          nome: 'Sala Meeting 1',
          descrizione: 'Sala per meeting fino a 8 persone',
          capacita: 8,
          prezzo_orario: 25.00,
          id_sede: 1,
          nome_sede: 'Sede Centrale'
        },
        {
          id_spazio: 2,
          nome: 'Open Space',
          descrizione: 'Spazio condiviso per lavoro individuale',
          capacita: 20,
          prezzo_orario: 15.00,
          id_sede: 1,
          nome_sede: 'Sede Centrale'
        }
      ];

      pool.query.mockResolvedValueOnce({
        rowCount: 2,
        rows: mockSpazi
      });

      const response = await request(app)
        .get('/api/spazi');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id_spazio');
      expect(response.body[0]).toHaveProperty('nome');
    });

    it('dovrebbe restituire array vuoto se non ci sono spazi', async () => {
      pool.query.mockResolvedValueOnce({
        rowCount: 0,
        rows: []
      });

      const response = await request(app)
        .get('/api/spazi');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/spazi/:id/disponibilita-slot/:date', () => {
    it('dovrebbe restituire la disponibilità degli slot per una data', async () => {
      const mockDisponibilita = [
        {
          ora_inizio: '09:00:00',
          ora_fine: '10:00:00',
          disponibile: true,
          prenotazione_id: null
        },
        {
          ora_inizio: '10:00:00',
          ora_fine: '11:00:00',
          disponibile: false,
          prenotazione_id: 1
        }
      ];

      pool.query.mockResolvedValueOnce({
        rowCount: 2,
        rows: mockDisponibilita
      });

      const response = await request(app)
        .get('/api/spazi/1/disponibilita-slot/2024-01-15');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('ora_inizio');
      expect(response.body[0]).toHaveProperty('disponibile');
    });

    it('dovrebbe restituire errore con data non valida', async () => {
      const response = await request(app)
        .get('/api/spazi/1/disponibilita-slot/invalid-date');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('dovrebbe restituire errore se spazio non esiste', async () => {
      pool.query.mockResolvedValueOnce({
        rowCount: 0,
        rows: []
      });

      const response = await request(app)
        .get('/api/spazi/999/disponibilita-slot/2024-01-15');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/spazi/:id', () => {
    it('dovrebbe restituire i dettagli di uno spazio specifico', async () => {
      const mockSpazio = {
        id_spazio: 1,
        nome: 'Sala Meeting 1',
        descrizione: 'Sala per meeting fino a 8 persone',
        capacita: 8,
        prezzo_orario: 25.00,
        id_sede: 1,
        nome_sede: 'Sede Centrale',
        indirizzo_sede: 'Via Roma 123, Milano'
      };

      pool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [mockSpazio]
      });

      const response = await request(app)
        .get('/api/spazi/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id_spazio');
      expect(response.body).toHaveProperty('nome');
      expect(response.body.nome).toBe('Sala Meeting 1');
    });

    it('dovrebbe restituire errore se spazio non esiste', async () => {
      pool.query.mockResolvedValueOnce({
        rowCount: 0,
        rows: []
      });

      const response = await request(app)
        .get('/api/spazi/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});
