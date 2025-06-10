// seedPromoCodes.js
require('dotenv').config();
const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:yourpassword@localhost:5432/hms_db',
});

async function seedPromoCodes() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < 20; i++) {
      const code = `PROMO${faker.number.int({ min: 1000, max: 9999 })}`;
      const discount = faker.number.int({ min: 5, max: 30 });
      const maxUses = faker.number.int({ min: 50, max: 100 });
      const expiry = faker.date.future();
      const isActive = true;

      await client.query(
        `INSERT INTO promo_codes (code, discount_percent, max_uses, expiry_date, is_active)
         VALUES ($1, $2, $3, $4, $5)`,
        [code, discount, maxUses, expiry, isActive]
      );
    }
    await client.query('COMMIT');
    console.log('Promo codes seeded');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(' Failed to seed promo codes:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedPromoCodes();
