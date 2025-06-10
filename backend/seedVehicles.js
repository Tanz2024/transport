require('dotenv').config();
const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');

faker.locale = 'en_MY';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:yourpassword@localhost:5432/hms_db',
});

const types = ['bus', 'train', 'ferry'];

const amenitiesList = {
  bus: ['WiFi', 'AC', 'Toilet', 'Charger', 'Recliner Seat'],
  train: ['Dining Car', 'Sleeper', 'AC', 'Restroom'],
  ferry: ['Upper Deck', 'Snack Bar', 'Restroom', 'AC']
};

function getPlateNumber(type) {
  if (type === 'bus') return `B${faker.number.int({ min: 1000, max: 9999 })} TANZ`;
  if (type === 'train') return `TRN-${faker.number.int({ min: 100, max: 999 })}`;
  if (type === 'ferry') return `FERRY-${faker.string.alphanumeric({ length: 5 }).toUpperCase()}`;
  return '';
}

async function seedVehicles() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const type of types) {
      for (let i = 0; i < 30; i++) {
        const operatorName = faker.company.name();
        const capacity = faker.number.int({ min: 20, max: type === 'train' ? 400 : 100 });
        const plateNumber = getPlateNumber(type);
        const amenities = faker.helpers.arrayElements(
          amenitiesList[type],
          faker.number.int({ min: 2, max: amenitiesList[type].length })
        );
        const active = faker.datatype.boolean();

        await client.query(
          `INSERT INTO vehicles (type, operator_name, capacity, plate_number, amenities, active)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [type, operatorName, capacity, plateNumber, JSON.stringify(amenities), active]
        );
      }
    }

    await client.query('COMMIT');
    console.log(' Seeded 90 vehicles (30 each for bus, train, ferry)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(' Vehicle seeding failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedVehicles();
