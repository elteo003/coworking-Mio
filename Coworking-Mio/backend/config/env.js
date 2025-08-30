// Configurazione variabili d'ambiente per Supabase
// Questo file dovrebbe essere sostituito con un file .env su Render

module.exports = {
  // Database Supabase - Configurazione per Supabase
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:mammaketty74!@db.czkiuvmhijhxuqzdtnmz.supabase.co:5432/postgres',

  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://coworking-mio-1.onrender.com,https://coworking-mio-1-backend.onrender.com,http://localhost:8000',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_here',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key_here',
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_your_stripe_publishable_key_here',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_WsLhQ9QXBBUdppq2marA47aOewWctgi9'
};
