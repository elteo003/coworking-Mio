// Setup per i test Jest
const path = require('path');

// Imposta NODE_ENV per i test
process.env.NODE_ENV = 'test';

// Carica le variabili d'ambiente per i test
require('dotenv').config({ path: path.join(__dirname, '../.env.test') });

// Mock del database per i test
jest.mock('../src/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn()
}));

// Mock di Redis per i test
jest.mock('../src/services/redisService', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  quit: jest.fn()
}));

// Mock di JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ id_utente: 1, ruolo: 'cliente' })
}));

// Mock di bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true)
}));

console.log('🧪 Setup test completato');
