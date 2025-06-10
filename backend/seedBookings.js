require('dotenv').config();
const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:yourpassword@localhost:5432/transport',
});

async function seedBookings() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const users = (await client.query('SELECT id FROM users')).rows;
    const schedules = (await client.query('SELECT id FROM schedules')).rows;

    if (!users.length || !schedules.length) {
      throw new Error('Cannot get value from empty dataset.');
    }

    for (let i = 0; i < 100; i++) {
      const user = faker.helpers.arrayElement(users);
      const schedule = faker.helpers.arrayElement(schedules);
      const seatNumber = faker.number.int({ min: 1, max: 50 });
      const status = faker.helpers.arrayElement(['booked', 'cancelled', 'completed']);
      const paymentStatus = faker.helpers.arrayElement(['pending', 'paid', 'failed']);

      await client.query(
        `INSERT INTO bookings (user_id, schedule_id, seat_number, status, payment_status)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, schedule.id, seatNumber, status, paymentStatus]
      );
    }

    await client.query('COMMIT');
    console.log(' Seeded 100 bookings');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(' Failed to seed bookings:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedBookings();
