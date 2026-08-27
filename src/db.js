const { Pool } = require('pg');
require('dotenv').config();

// Supabase requires SSL. Locally against a plain Postgres instance without SSL,
// set PGSSLMODE=disable in your .env if you hit an SSL error.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
