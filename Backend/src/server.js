const path = require('path');
const app = require('./app');
require('dotenv').config();
const pool = require('./config/db');

const PORT = process.env.PORT || 5000;

// Global process handlers to surface errors during startup/runtime
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
  // Allow default behavior after logging
  process.exit(1);
});

async function start() {
  try {
    // test DB connection but do not fail startup if DB is temporarily unavailable
    try {
      const client = await pool.connect();
      client.release();
      console.log('Database connection OK');
    } catch (dbErr) {
      console.warn('Database connection failed on startup (continuing):', dbErr.message);
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
