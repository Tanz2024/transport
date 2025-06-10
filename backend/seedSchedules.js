require('dotenv').config();
const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');

faker.locale = 'en_MY';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:yourpassword@localhost:5432/hms_db',
});

async function seedSchedules() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const routesRes = await client.query('SELECT id FROM routes');
    const vehiclesRes = await client.query('SELECT id FROM vehicles');

    const routes = routesRes.rows.map(r => r.id);
    const vehicles = vehiclesRes.rows.map(v => v.id);

    if (routes.length === 0 || vehicles.length === 0) {
      throw new Error('❌ No routes or vehicles found. Seed them first.');
    }

    for (let i = 0; i < 90; i++) {
      const route_id = faker.helpers.arrayElement(routes);
      const vehicle_id = faker.helpers.arrayElement(vehicles);

      const departure = faker.date.future({ years: 1 });
      const arrival = new Date(departure.getTime() + faker.number.int({ min: 30, max: 300 }) * 60000); // +30 to +300 mins

      const price = faker.number.int({ min: 10, max: 150 });
      const available_seats = faker.number.int({ min: 10, max: 100 });
      const status = faker.helpers.arrayElement(['scheduled', 'delayed', 'cancelled']);

      await client.query(
        `INSERT INTO schedules (route_id, vehicle_id, departure_time, arrival_time, price, available_seats, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [route_id, vehicle_id, departure, arrival, price, available_seats, status]
      );
    }

    await client.query('COMMIT');
    console.log(' Seeded 90 schedules');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(' Failed to seed schedules:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedSchedules();
