import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './src/config/env.js';
import sequelize, { testConnection } from './src/config/db.js';
import { associateModels } from './src/models/index.js';
import apiRoutes from './src/routes/index.js';

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  console.error('Stack:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  if (reason && reason.stack) {
    console.error('Stack:', reason.stack);
  }
});

process.on('exit', (code) => {
  console.log(`Process exiting with code: ${code}`);
});

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Map Sequelize errors to appropriate HTTP status codes
  if (err.name === 'SequelizeUniqueConstraintError') {
    // Duplicate key error (e.g., duplicate SKU, duplicate instance_code)
    const fields = err.errors?.map(e => e.path).join(', ') || 'field';
    return res.status(409).json({
      error: `Duplicate value for ${fields}. This record already exists.`,
      details: err.errors?.map(e => ({ field: e.path, message: e.message }))
    });
  }

  if (err.name === 'SequelizeValidationError') {
    // Validation errors (e.g., null constraint, check constraint)
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors?.map(e => ({ field: e.path, message: e.message }))
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    // Foreign key constraint violation
    return res.status(422).json({
      error: 'Referenced record does not exist or cannot be deleted due to existing references.',
      details: err.message
    });
  }

  if (err.name === 'SequelizeDatabaseError') {
    // Generic database error - check for specific PostgreSQL error codes
    if (err.original?.code === '23505') {
      // Unique violation
      return res.status(409).json({ error: 'Record already exists' });
    }
    if (err.original?.code === '23503') {
      // Foreign key violation
      return res.status(422).json({ error: 'Referenced record not found' });
    }
    if (err.original?.code === '23502') {
      // Not null violation
      return res.status(400).json({ error: 'Required field is missing' });
    }
    // Log other database errors as warnings
    console.warn('Unhandled database error:', err.original);
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Failed to connect to database. Exiting...');
      console.error('Check DATABASE_URL and ensure PostgreSQL is running.');
      process.exit(1);
    }

    // Import and associate all models
    await associateModels();

    // Sync is disabled because schema is managed by init.sql
    // await sequelize.sync({ alter: false }); 
    console.log('✅ Database schema managed by init.sql (Sync Disabled)');

    // Start server
    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

startServer();

