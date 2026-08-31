const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function ensureAuthSchema() {
  try {
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS security_question TEXT,
        ADD COLUMN IF NOT EXISTS security_answer_hash TEXT;
    `);
    console.log('Auth schema verified successfully');
  } catch (err) {
    console.error('Auth schema setup error:', err.message);
  }
}

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('DB connection error:', err.message);
  } else {
    console.log('DB connected at:', res.rows[0].now);
    ensureAuthSchema();
  }
});

module.exports = pool;