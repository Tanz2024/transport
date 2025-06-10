require('dotenv').config();
const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');

faker.locale = 'en_MY';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:yourpassword@localhost:5432/hms_db',
});

async function seedRoutes() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch all distinct station IDs grouped by city
    const { rows: stations } = await client.query(`SELECT id, city FROM stations`);
    const cityGroups = {};

    stations.forEach(station => {
      if (!cityGroups[station.city]) cityGroups[station.city] = [];
      cityGroups[station.city].push(station.id);
    });

    const cities = Object.keys(cityGroups);
    const generatedPairs = new Set();

    const generateKey = (a, b) => [a, b].sort().join('-');

    for (let i = 0; i < 100; i++) {
      let originCity, destCity;
      do {
        originCity = faker.helpers.arrayElement(cities);
        destCity = faker.helpers.arrayElement(cities);
      } while (originCity === destCity || generatedPairs.has(generateKey(originCity, destCity)));

      generatedPairs.add(generateKey(originCity, destCity));

      const origin_id = faker.helpers.arrayElement(cityGroups[originCity]);
      const destination_id = faker.helpers.arrayElement(cityGroups[destCity]);

      const distance = faker.number.int({ min: 50, max: 800 }); // in km
      const duration = Math.round((distance / faker.number.float({ min: 40, max: 100 })) * 60); // minutes

      await client.query(
        `INSERT INTO routes (origin_id, destination_id, distance_km, duration_minutes)
         VALUES ($1, $2, $3, $4)`,
        [origin_id, destination_id, distance, duration]
      );
    }

    await client.query('COMMIT');
    console.log(' Seeded 100 random routes between Malaysian cities');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(' Route seeding failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedRoutes();
