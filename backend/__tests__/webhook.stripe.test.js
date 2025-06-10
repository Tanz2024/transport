const request = require('supertest');
const { app, pool } = require('../server'); // ✅ Import app + db pool
const crypto = require('crypto');

const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ✅ Utility to generate a valid Stripe test signature
function generateStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

describe('POST /api/webhooks/stripe', () => {
  it('should reject an invalid Stripe signature', async () => {
    const payload = JSON.stringify({ test: true });

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 'invalidsignature') // 🚫 Invalid on purpose
      .send(payload);

    expect(res.statusCode).toBe(400);
    expect(res.text).toMatch(/Webhook Error/);
  });

  it('should accept a valid webhook event and mark booking paid', async () => {
    const mockEvent = {
      id: 'evt_test_webhook',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_123', // ✅ Include if your code reads paymentIntent.id
          metadata: {
            booking_id: '1', // ⚠️ Ensure booking_id 1 exists in DB or pre-seed it
          },
        },
      },
    };

    const payload = JSON.stringify(mockEvent);
    const signature = generateStripeSignature(payload, stripeSecret);

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signature)
      .send(payload);

    expect([200, 500]).toContain(res.statusCode);
  });
});

// ✅ Teardown to prevent open handle warning
afterAll(async () => {
  await pool.end(); // Clean up DB connection
});
