import dotenv from 'dotenv';

dotenv.config();

export default {
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://aify_user:aify_password@localhost:5432/aify_erp',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
};

