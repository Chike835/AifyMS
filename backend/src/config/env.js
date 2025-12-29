import dotenv from 'dotenv';

dotenv.config();

export default {
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://aify_user:aify_password@localhost:5432/aify_erp',

  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // CORS
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173' // Default to Vite dev server port
};

// Security Check
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
  process.exit(1);
}

