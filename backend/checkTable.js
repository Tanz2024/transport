require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function checkTable() {
  try {
    const result = await pool.query(`
      SELECT * FROM information_schema.tables 
      WHERE table_name = 'seat_reservations'
    `);
    
    console.log('Table exists:', result.rows.length > 0);
    
    if (result.rows.length === 0) {
      console.log('Creating table...');
      await pool.query(`
        CREATE TABLE seat_reservations (
          id SERIAL PRIMARY KEY,
          schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
          seat_number TEXT NOT NULL,
          session_id TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(schedule_id, seat_number)
        );
        
        CREATE INDEX idx_seat_reservations_expires_at ON seat_reservations(expires_at);
        CREATE INDEX idx_seat_reservations_schedule_id ON seat_reservations(schedule_id);
        CREATE INDEX idx_seat_reservations_session_id ON seat_reservations(session_id);
      `);
      console.log('✅ Table created successfully');
    } else {
      console.log('✅ Table already exists');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkTable();
