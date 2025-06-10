require('dotenv').config();
const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');

faker.locale = 'en_MY';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:yourpassword@localhost:5432/hms_db',
});

async function seedBookingPromos(client) {
  const bookings = await client.query('SELECT id FROM bookings');
  const promos = await client.query('SELECT id, discount_percent FROM promo_codes');

  if (!bookings.rows.length || !promos.rows.length) {
    console.warn('  Skipping booking_promos seeding: no bookings or promos');
    return;
  }

  const count = Math.min(30, bookings.rows.length, promos.rows.length);
  for (let i = 0; i < count; i++) {
    const booking = bookings.rows[i];
    const promo = promos.rows[i];

    await client.query(
      `INSERT INTO booking_promos (booking_id, promo_id, discount_applied)
       VALUES ($1, $2, $3)`,
      [
        booking.id,
        promo.id,
        promo.discount_percent || faker.number.int({ min: 5, max: 30 })
      ]
    );
  }

  console.log(` Seeded ${count} booking_promos`);
}

async function seedAdminLogs(client) {
  const admins = await client.query(`SELECT id FROM users WHERE role = 'admin'`);

  if (!admins.rows.length) {
    console.warn('  Skipping admin_logs seeding: no admins found');
    return;
  }

  const tables = ['users', 'bookings', 'vehicles', 'routes', 'payments'];
  const actions = ['CREATE', 'UPDATE', 'DELETE'];

  for (let i = 0; i < 20; i++) {
    await client.query(
      `INSERT INTO admin_logs (admin_id, action, target_table, target_id)
       VALUES ($1, $2, $3, $4)`,
      [
        faker.helpers.arrayElement(admins.rows).id,
        faker.helpers.arrayElement(actions),
        faker.helpers.arrayElement(tables),
        faker.number.int({ min: 1, max: 100 })
      ]
    );
  }

  console.log(' Seeded 20 admin_logs');
}

async function seedBaggage(client) {
  const bookings = await client.query('SELECT id FROM bookings');

  if (!bookings.rows.length) {
    console.warn('  Skipping baggage seeding: no bookings found');
    return;
  }

  const count = Math.min(30, bookings.rows.length);
  for (let i = 0; i < count; i++) {
    await client.query(
      `INSERT INTO baggage (booking_id, weight_kg, type, is_checked_in)
       VALUES ($1, $2, $3, $4)`,
      [
        bookings.rows[i].id,
        faker.number.float({ min: 5, max: 25, precision: 0.1 }),
        faker.helpers.arrayElement(['carry-on', 'checked', 'oversize']),
        faker.datatype.boolean()
      ]
    );
  }

  console.log(` Seeded ${count} baggage records`);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await seedBookingPromos(client);
    await seedAdminLogs(client);
    await seedBaggage(client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(' Seeding failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
