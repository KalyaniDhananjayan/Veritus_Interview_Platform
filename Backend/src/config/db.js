const { Pool } = require('pg');

const pool = new Pool({
  user: 'veritus',
  host: 'localhost',
  database: 'veritus_db',
  password: 'veritus123',
  port: 5432,
});

module.exports = pool;
