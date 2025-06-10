require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createSeatReservationTable() {
  const client = await pool.connect();
  try {
    console.log('Creating seat_reservations table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS seat_reservations (
        id SERIAL PRIMARY KEY,
        schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
        seat_number TEXT NOT NULL,
        session_id TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(schedule_id, seat_number)
      );
    `);
    
    console.log('Creating indexes...');
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_seat_reservations_expires_at ON seat_reservations(expires_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_seat_reservations_schedule_id ON seat_reservations(schedule_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_seat_reservations_session_id ON seat_reservations(session_id);`);
    
    console.log('✅ Successfully created seat_reservations table and indexes');
    
  } catch (err) {
    console.error('❌ Error creating table:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

createSeatReservationTable()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to create table:', err);
    process.exit(1);
  });
