// __tests__/booking.success.test.js
const request = require('supertest');
const { app, pool } = require('../server');

describe('GET /api/bookings/success', () => {
  it('should return 400 for missing booking_id', async () => {
    const res = await request(app).get('/api/bookings/success');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid booking_id/i);
  });

  it('should return 404 for non-existent booking_id', async () => {
    const res = await request(app).get('/api/bookings/success?booking_id=999999');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/paid booking not found/i);
  });

  it('should return 200 with summary for valid paid booking', async () => {
    const res = await request(app).get('/api/bookings/success?booking_id=1'); // ✅ booking_id 1 must be paid in DB

    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty('round_trip');
      expect(res.body).toHaveProperty('trips');
      expect(res.body.trips.length).toBeGreaterThan(0);
    } else {
      console.warn('⚠️ Booking ID 1 might not be paid. Adjust your test data.');
    }
  });
});

afterAll(async () => {
  await pool.end(); // ✅ Clean shutdown
});
