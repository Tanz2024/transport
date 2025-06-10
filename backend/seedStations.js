require('dotenv').config();

const { Pool } = require('pg');
const faker = require('@faker-js/faker').faker;

faker.locale = 'en_MY';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const cityCoords = {
  "Kuala Lumpur": [3.139, 101.6869],
  "George Town": [5.4141, 100.3288],
  "Johor Bahru": [1.4927, 103.7414],
  "Kota Kinabalu": [5.9804, 116.0735],
  "Kuching": [1.5533, 110.3592],
  "Ipoh": [4.5975, 101.0901],
  "Shah Alam": [3.0738, 101.5183],
  "Melaka": [2.1896, 102.2501],
  "Alor Setar": [6.121, 100.366],
  "Seremban": [2.7297, 101.9381],
  "Miri": [4.3993, 113.9915],
  "Petaling Jaya": [3.1073, 101.6067],
  "Butterworth": [5.3992, 100.3638],
  "Kuantan": [3.8147, 103.3256],
  "Langkawi": [6.3528, 99.8245],
};

const types = ['bus', 'train', 'ferry'];

async function seedStations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const type of types) {
      for (let i = 0; i < 30; i++) {
        const cities = Object.keys(cityCoords);
        const city = faker.helpers.arrayElement(cities);
        const [lat, lng] = cityCoords[city];

        const name = `${faker.company.name()} ${type.charAt(0).toUpperCase() + type.slice(1)} Terminal`;
        const country = 'Malaysia';

        await client.query(
          `INSERT INTO stations (name, city, country, latitude, longitude)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            name,
            city,
            country,
            (lat + faker.number.float({ min: -0.01, max: 0.01 })).toFixed(6),
            (lng + faker.number.float({ min: -0.01, max: 0.01 })).toFixed(6)
          ]
        );
      }
    }
    await client.query('COMMIT');
    console.log(' Seeded 90 stations (30 each for bus, train, ferry)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(' Failed to seed stations:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedStations();
