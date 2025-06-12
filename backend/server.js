import dotenv from 'dotenv';
dotenv.config();
import stripePkg from 'stripe';
const stripe = stripePkg(process.env.STRIPE_SECRET_KEY);
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import BookingValidationService from './services/BookingValidationService.js';
import ProductionBookingService from './services/ProductionBookingService.js';
import SeatAvailabilityService from './services/SeatAvailabilityService.js';

// server.js
const app  = express();
const port = process.env.PORT || 5000;
// ─── PostgreSQL Database Setup ───────────────────────
import { Pool } from 'pg';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize validation service
const validationService = new BookingValidationService(pool);
const productionBookingService = new ProductionBookingService(pool, stripe);
const seatAvailabilityService = new SeatAvailabilityService(pool);

// Automatic cleanup of expired seat reservations every 2 minutes
setInterval(async () => {
  try {
    await seatAvailabilityService.cleanupExpiredReservations();
  } catch (err) {
    console.error('❌ Periodic cleanup failed:', err);
  }
}, 2 * 60 * 1000); // 2 minutes

// Automatic cleanup of expired seat reservations every 2 minutes
setInterval(async () => {
  try {
    await seatAvailabilityService.cleanupExpiredReservations();
  } catch (err) {
    console.error('❌ Periodic cleanup failed:', err);
  }
}, 2 * 60 * 1000); // 2 minutes

// ─── Express Session with PostgreSQL Store ────────────
import session from 'express-session';
import pgSession from 'connect-pg-simple';

app.use(session({
  store: new (pgSession(session))({
    pool,                 // Reuse the existing PostgreSQL pool
    tableName: 'session', // Matches manually created session table
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS-only cookies in production
    httpOnly: true,                                // Prevents JS access to cookies
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,                // 7 days
  },
}));


const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

app.use('/uploads', express.static('uploads'));
// server.js or routes/stripe.js
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const isRoundTrip = paymentIntent.metadata?.is_round_trip === 'true';
    const sessionId = paymentIntent.metadata?.session_id;
    try {
      if (isRoundTrip) {
        // Parse all required metadata for round-trip
        const outbound = paymentIntent.metadata?.outbound ? JSON.parse(paymentIntent.metadata.outbound) : null;
        const returnTrip = paymentIntent.metadata?.returnTrip ? JSON.parse(paymentIntent.metadata.returnTrip) : null;
        const passengerInfo = paymentIntent.metadata?.passenger_info ? JSON.parse(paymentIntent.metadata.passenger_info) : null;
        const extras = paymentIntent.metadata?.extras ? JSON.parse(paymentIntent.metadata.extras) : {};
        const promoCode = paymentIntent.metadata?.promo_code || null;
        const userId = paymentIntent.metadata?.user_id || null;
        // Create the actual round-trip booking after payment
        const bookingData = { outbound, returnTrip, passenger_info: passengerInfo, user_id: userId, extras, promo_code: promoCode };
        const result = await productionBookingService.createRoundTripBookingAfterPayment(bookingData);
        // Clean up temporary seat reservations
        await seatAvailabilityService.releaseSeatsTemporary(outbound.schedule_id, outbound.seat_numbers, sessionId);
        await seatAvailabilityService.releaseSeatsTemporary(returnTrip.schedule_id, returnTrip.seat_numbers, sessionId);
        console.log(`✅ Round-trip booking created after payment for outbound ${outbound.schedule_id}, return ${returnTrip.schedule_id}`);
      } else {
        // One-way booking logic (already handled above)
        const scheduleId = paymentIntent.metadata?.schedule_id;
        const seatNumbers = paymentIntent.metadata?.seat_numbers ? JSON.parse(paymentIntent.metadata.seat_numbers) : [];
        const passengerInfo = paymentIntent.metadata?.passenger_info ? JSON.parse(paymentIntent.metadata.passenger_info) : null;
        const extras = paymentIntent.metadata?.extras ? JSON.parse(paymentIntent.metadata.extras) : {};
        const promoCode = paymentIntent.metadata?.promo_code || null;
        const userId = paymentIntent.metadata?.user_id || null;
        const bookingData = { schedule_id: Number(scheduleId), seat_numbers: seatNumbers, passenger_info: passengerInfo, user_id: userId, extras, promo_code: promoCode };
        const result = await productionBookingService.createOneWayBookingAfterPayment(bookingData);
        await seatAvailabilityService.releaseSeatsTemporary(scheduleId, seatNumbers, sessionId);
        console.log(`✅ Booking created after payment for schedule ${scheduleId}, seats: ${seatNumbers}`);
      }
    } catch (err) {
      console.error('❌ Error creating booking after payment:', err);
    }
  }
  res.status(200).send('Webhook received');
});
app.get('/api/webhooks/logs', async (req, res) => {
  try {
    const logs = await pool.query(`SELECT * FROM stripe_webhook_logs ORDER BY timestamp DESC LIMIT 50`);
    res.json(logs.rows);
  } catch (err) {
    res.status(500).json({ error: 'Unable to fetch logs' });
  }
});


app.use(express.json());
app.use(helmet());


const optionalAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return next(); // allow guest

  const token = authHeader.split(" ")[1];
  if (!token) return next();

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user; // attach if valid
  } catch {
    // Invalid token? Still let it pass as guest
  }

  next();
};

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // allow up to 1000 requests per minute
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);


// ─── JWT AUTHENTICATION MIDDLEWARE ────────────────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1]; // Safely split with optional chaining

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}


pool.on('error', err => console.error('Unexpected PG error', err));

// ─── QUERY UTIL ──────────────────────────────────────────────────────────────
async function query(res, text, params = []) {
  try {
    const { rows } = await pool.query(text, params);
    return rows;
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
    throw err;
  }
}
// upload.js
import multer from 'multer';
import path from 'path';

// Storage location and filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${Date.now()}${ext}`);
  }
});

// File filter for image types
const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpg, .jpeg, .png, and .webp files are allowed'));
  }
};

const upload = multer({ storage, fileFilter });

app.post('/api/users/:id/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  const userId = Number(req.params.id);
  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const imagePath = `/uploads/${req.file.filename}`;

  const rows = await query(res,
    `UPDATE users SET profile_image = $1 WHERE id = $2 RETURNING profile_image`,
    [imagePath, userId]
  );

  res.json({ success: true, profile_image: rows[0].profile_image });
});



// ─── USERS ─────────────────────────────────────────────────────────────────────
app.get('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const rows = await query(res, 'SELECT id, name, email, phone_number, role FROM users');
  res.json(rows);
});

// ─── GET USER BY ID (User can only access own profile or Admin) ────────
app.get('/api/users/:id', authenticateToken, async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const rows = await query(res,
    `SELECT id, name, email, phone_number, role,
            profile_image, preferred_currency, preferred_country,
            bio, gender, date_of_birth, created_at,
            booking_preferences, verified, referral_code, referred_by
     FROM users
     WHERE id = $1`,
    [userId]
  );

  if (!rows.length) return res.status(404).json({ error: 'User not found' });

  res.json(rows[0]);
});

// ─── REGISTER NEW USER ─────────────────────────────────────────────────
app.post('/api/users', async (req, res) => {
  const { name, email, password, phone_number } = req.body;

  if (!name || !email || !password || !phone_number) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // ✅ Check if email already exists first
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered, please login.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const rows = await query(res,
      `INSERT INTO users (name, email, password_hash, phone_number)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, phone_number`,
      [name, email, hashedPassword, phone_number]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('User registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});


// ─── LOGIN USER ────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const rows = await query(res, 'SELECT * FROM users WHERE email = $1', [email]);
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

res.json({
  token,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    phone_number: user.phone_number,
    role: user.role,
    profile_image: user.profile_image,
    preferred_currency: user.preferred_currency,
    preferred_country: user.preferred_country,
    booking_preferences: user.booking_preferences,
    verified: user.verified,
    referral_code: user.referral_code,
    referred_by: user.referred_by,
    bio: user.bio,
    gender: user.gender,
    date_of_birth: user.date_of_birth,
    two_factor_enabled: user.two_factor_enabled,
    created_at: user.created_at,
    city: user.city,
    state: user.state,
    country: user.country
  }
});


});
// ─── UPDATE USER ───────────────────────────────────────────────────────
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.id !== Number(req.params.id) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const updates = { ...req.body };

  // Handle password hashing if password is included
  if (updates.password) {
    updates.password_hash = await bcrypt.hash(updates.password, 10);
    delete updates.password;
  }

  // Only allow updating these fields:
const allowedFields = [
  'name', 'first_name', 'middle_name', 'last_name', 'full_name',
  'phone_number', 'profile_image', 'preferred_currency', 'preferred_country',
  'bio', 'gender', 'date_of_birth', 'two_factor_enabled', 'booking_preferences',
  'city', 'state', 'country'
];

  Object.keys(updates).forEach(key => {
    if (!allowedFields.includes(key)) delete updates[key];
  });

  const cols = Object.keys(updates);
  const vals = Object.values(updates);

  if (cols.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const set = cols.map((col, idx) => `${col} = $${idx + 1}`).join(', ');

  const rows = await query(res,
  `UPDATE users SET ${set} WHERE id = $${cols.length + 1}
   RETURNING id, name, first_name, middle_name, last_name, full_name, email, phone_number, role,
             profile_image, preferred_currency, preferred_country,
             bio, gender, date_of_birth, two_factor_enabled, created_at,
             booking_preferences, verified, referral_code, referred_by,
             city, state, country`,
  [...vals, req.params.id]
);


  res.json(rows[0]);
});


// ─── DELETE USER ───────────────────────────────────────────────────────
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.id !== Number(req.params.id) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await query(res, 'DELETE FROM users WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
app.get('/api/profile', async (req, res) => {
  const { userId, guestId } = req.session || {};

  if (!userId && !guestId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const id = userId || guestId;
    const isGuest = !!guestId;

    const result = await pool.query(
      `SELECT ${isGuest ? 'guest_name AS name, email' : 'first_name || \' \' || last_name AS name, email, phone'} FROM ${isGuest ? 'guests' : 'users'} WHERE id = $1`,
      [id]
    );

    if (!result.rows.length) return res.status(404).json({ message: 'Not found' });

    res.json({ ...result.rows[0], type: isGuest ? 'guest' : 'user' });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// server.js or routes/guest.js
app.post('/api/guests', async (req, res) => {
  const { first_name, last_name, email, phone } = req.body;

  if (!first_name || !last_name || !email || !phone) {
    return res.status(400).json({ error: 'Missing guest fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO guests (first_name, last_name, email, phone)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [first_name, last_name, email, phone]
    );
    req.session.guestId = result.rows[0].id;
    return res.status(201).json({ guestId: result.rows[0].id });
  } catch (error) {
    console.error('Guest register error', error);
    return res.status(500).json({ error: 'Guest registration failed' });
  }
});


// ─── CITIES (Dropdown Options) ───────────────────────────────────────────────
app.get('/api/cities', async (req, res) => {
  const type = req.query.type;

  let rows;
  if (type) {
    const queryText = `
      SELECT DISTINCT st.city
      FROM schedules s
      JOIN routes r ON s.route_id = r.id
      JOIN vehicles v ON s.vehicle_id = v.id
      JOIN stations st ON r.origin_id = st.id
      WHERE LOWER(v.type) = LOWER($1)
      UNION
      SELECT DISTINCT st.city
      FROM schedules s
      JOIN routes r ON s.route_id = r.id
      JOIN vehicles v ON s.vehicle_id = v.id
      JOIN stations st ON r.destination_id = st.id
      WHERE LOWER(v.type) = LOWER($1)
      ORDER BY city;
    `;
    rows = await query(res, queryText, [type]);
  } else {
    rows = await query(res, 'SELECT DISTINCT city FROM stations ORDER BY city');
  }

  res.json(rows.map(r => r.city));
});

app.get('/api/cities-with-states', async (req, res) => {
  const rows = await query(res, 'SELECT DISTINCT city, state FROM stations ORDER BY state, city');
  res.json(rows);
});

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────
// ─── BOOKINGS ────────────────────────────────────────────────────────────────

// 1. List all bookings (user-specific, secure)
app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // One-way bookings
    const oneWayRows = await pool.query(
      `SELECT b.*, s.departure_time, s.arrival_time, os.city as from_location, ds.city as to_location
       FROM bookings b
       JOIN schedules s ON b.schedule_id = s.id
       JOIN routes r ON s.route_id = r.id
       JOIN stations os ON r.origin_id = os.id
       JOIN stations ds ON r.destination_id = ds.id
       WHERE b.user_id = $1 AND b.status != 'cancelled' AND b.id NOT IN (SELECT outbound_booking_id FROM round_trip_bookings UNION SELECT return_booking_id FROM round_trip_bookings)
       ORDER BY s.departure_time DESC`,
      [userId]
    );
    // Round-trip bookings
    const roundTripRows = await pool.query(
      `SELECT rtb.id as round_trip_id,
              ob.status as ob_status, ob.seat_number as ob_seat_number, ob.total_price as ob_total_price, ob.qr_code_url as ob_qr_code_url,
              os.city as ob_from_location, ds.city as ob_to_location, s.departure_time as ob_departure_time,
              rb.status as rb_status, rb.seat_number as rb_seat_number, rb.total_price as rb_total_price, rb.qr_code_url as rb_qr_code_url,
              os2.city as rb_from_location, ds2.city as rb_to_location, s2.departure_time as rb_departure_time
       FROM round_trip_bookings rtb
       JOIN bookings ob ON rtb.outbound_booking_id = ob.id
       JOIN bookings rb ON rtb.return_booking_id = rb.id
       JOIN schedules s ON ob.schedule_id = s.id
       JOIN routes r ON s.route_id = r.id
       JOIN stations os ON r.origin_id = os.id
       JOIN stations ds ON r.destination_id = ds.id
       JOIN schedules s2 ON rb.schedule_id = s2.id
       JOIN routes r2 ON s2.route_id = r2.id
       JOIN stations os2 ON r2.origin_id = os2.id
       JOIN stations ds2 ON r2.destination_id = ds2.id
       WHERE ob.user_id = $1 AND rb.user_id = $1 AND ob.status != 'cancelled' AND rb.status != 'cancelled'
       ORDER BY s.departure_time DESC`,
      [userId]
    );
    res.json({ oneWay: oneWayRows.rows, roundTrip: roundTripRows.rows });
  } catch (err) {
    console.error('Error listing bookings:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Booking success endpoint (PRODUCTION LEVEL)
app.get('/api/bookings/success', async (req, res) => {
  try {
    const rawId = req.query.booking_id;
    const bookingId = Number(rawId);

    if (!rawId || isNaN(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking_id' });
    }

    // Check if it's a round-trip booking first
    const rtCheck = await pool.query(
      'SELECT id FROM round_trip_bookings WHERE id = $1',
      [bookingId]
    );

    const isRoundTrip = rtCheck.rows.length > 0;

    // Use production service to get booking details
    const bookingDetails = await productionBookingService.getBookingDetails(bookingId, isRoundTrip);

    res.json({
      id: bookingDetails.id,
      status: 'confirmed',
      created_at: new Date().toISOString(),
      first_name: bookingDetails.passenger_name.split(' ')[0] || 'Guest',
      last_name: bookingDetails.passenger_name.split(' ').slice(1).join(' ') || '',
      email: bookingDetails.passenger_email,
      phone: bookingDetails.passenger_phone,
      extra_luggage: bookingDetails.extra_luggage || 0,
      offset_co2: bookingDetails.offset_co2 || false,
      add_insurance: bookingDetails.add_insurance || false,
      promo_code: bookingDetails.promo_code || '',
      payment_method: 'card',
      trips: bookingDetails.trips,
      subtotal: bookingDetails.total_paid,
      discount_amount: 0,
      total_paid: bookingDetails.total_paid,
      invoice_url: `https://yourdomain.com/invoice/${bookingDetails.id}.pdf`,
      is_round_trip: bookingDetails.is_round_trip,
      type: 'user'
    });

  } catch (err) {
    console.error('❌ Booking success fetch failed:', err);
    res.status(500).json({ error: 'Failed to fetch booking details' });
  }
});


// 3. Get a single booking by ID
app.get('/api/bookings/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid booking ID' });

  try {
    const rows = await query(res, 'SELECT * FROM bookings WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).end();
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching booking:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
// 4. Reserve seats for a new booking (ONE-WAY with multiple seats, before payment)
app.post('/api/bookings', optionalAuth, async (req, res) => {
  try {
    const {
      schedule_id,
      seat_numbers, // Array of seat numbers for multiple seats
      passenger_info, // { firstName, lastName, email, phone }
      extras = { luggage: 0, co2: false, insurance: false },
      promo_code = null
    } = req.body;

    if (!schedule_id || !seat_numbers || !Array.isArray(seat_numbers) || seat_numbers.length === 0) {
      return res.status(400).json({ error: 'Missing required booking data: schedule_id and seat_numbers array' });
    }

    const seatArray = Array.isArray(seat_numbers) ? seat_numbers : [seat_numbers];
    const sessionId = req.sessionID || req.headers['x-session-id'] || (Math.random().toString(36).slice(2));

    // Reserve seats temporarily
    try {
      await seatAvailabilityService.reserveSeatsTemporary(schedule_id, seatArray, sessionId, 10);
    } catch (err) {
      console.error('❌ Seat reservation failed:', err);
      return res.status(409).json({ error: err.message });
    }

    // Return reservation info to frontend
    res.status(201).json({
      reserved: true,
      schedule_id,
      seat_numbers: seatArray,
      session_id: sessionId,
      expires_at: new Date(Date.now() + 10 * 60000).toISOString()
    });
  } catch (err) {
    console.error('❌ Booking reservation failed:', err);
    res.status(500).json({ error: 'Failed to reserve seats. Please try again.' });
  }
});

// 5. Update an existing booking
app.put('/api/bookings/:id', async (req, res) => {
  const id   = Number(req.params.id);
  const cols = Object.keys(req.body);
  const vals = Object.values(req.body);
  if (!id) return res.status(400).json({ error: 'Invalid booking ID' });
  if (!cols.length) return res.status(400).json({ error: 'No fields to update' });

  const set = cols.map((c,i) => `${c}=$${i+1}`).join(',');
  try {
    const result = await pool.query(
      `UPDATE bookings
         SET ${set}
         WHERE id = $${cols.length+1}
       RETURNING *`,
      [...vals, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating booking:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 6. Delete a booking
app.delete('/api/bookings/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid booking ID' });

  try {
    await pool.query('DELETE FROM bookings WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 7. Reserve seats for round-trip bookings (PRODUCTION LEVEL)
app.post('/api/round-trip-bookings', optionalAuth, async (req, res) => {
  try {
    const { outbound, returnTrip, passenger_info, extras = {}, promo_code = null } = req.body;
    if (!outbound || !returnTrip) {
      return res.status(400).json({ error: 'Both outbound and return trip data required' });
    }
    if (!outbound.schedule_id || !outbound.seat_numbers || !Array.isArray(outbound.seat_numbers)) {
      return res.status(400).json({ error: 'Outbound trip missing schedule_id or seat_numbers array' });
    }
    if (!returnTrip.schedule_id || !returnTrip.seat_numbers || !Array.isArray(returnTrip.seat_numbers)) {
      return res.status(400).json({ error: 'Return trip missing schedule_id or seat_numbers array' });
    }
    const sessionId = req.sessionID || req.headers['x-session-id'] || (Math.random().toString(36).slice(2));
    // Reserve outbound seats
    try {
      await seatAvailabilityService.reserveSeatsTemporary(outbound.schedule_id, outbound.seat_numbers, sessionId, 10);
    } catch (err) {
      console.error('❌ Outbound seat reservation failed:', err);
      return res.status(409).json({ error: 'Outbound: ' + err.message });
    }
    // Reserve return seats
    try {
      await seatAvailabilityService.reserveSeatsTemporary(returnTrip.schedule_id, returnTrip.seat_numbers, sessionId, 10);
    } catch (err) {
      // Clean up outbound reservation if return fails
      await seatAvailabilityService.releaseSeatsTemporary(outbound.schedule_id, outbound.seat_numbers, sessionId);
      console.error('❌ Return seat reservation failed:', err);
      return res.status(409).json({ error: 'Return: ' + err.message });
    }
    res.status(201).json({
      reserved: true,
      outbound,
      returnTrip,
      session_id: sessionId,
      expires_at: new Date(Date.now() + 10 * 60000).toISOString()
    });
  } catch (err) {
    console.error('❌ Round-trip reservation failed:', err);
    res.status(500).json({ error: 'Failed to reserve round-trip seats. Please try again.' });
  }
});

// ─── SEAT AVAILABILITY ──────────────────────────────────────────────────────
// Get real-time seat availability for a schedule
app.get('/api/schedules/:id/seats', async (req, res) => {
  try {
    const scheduleId = Number(req.params.id);
    if (!scheduleId) {
      return res.status(400).json({ error: 'Invalid schedule ID' });
    }

    const availability = await seatAvailabilityService.getSeatAvailability(scheduleId);
    res.json(availability);

  } catch (err) {
    console.error('❌ Error fetching seat availability:', err);
    res.status(500).json({ error: 'Failed to fetch seat availability' });
  }
});

// Get seat layout with availability for a schedule
app.get('/api/schedules/:id/seat-layout', async (req, res) => {
  try {
    const scheduleId = Number(req.params.id);
    const vehicleType = req.query.vehicle_type || 'bus';

    if (!scheduleId) {
      return res.status(400).json({ error: 'Invalid schedule ID' });
    }

    const layout = await seatAvailabilityService.getSeatLayoutWithAvailability(scheduleId, vehicleType);
    res.json(layout);

  } catch (err) {
    console.error('❌ Error fetching seat layout:', err);
    res.status(500).json({ error: 'Failed to fetch seat layout' });
  }
});

// Reserve seats temporarily during booking process
app.post('/api/schedules/:id/reserve-seats', async (req, res) => {
  try {
    const scheduleId = Number(req.params.id);
    const { seat_numbers, session_id, timeout_minutes = 10 } = req.body;

    if (!scheduleId || !seat_numbers || !Array.isArray(seat_numbers) || !session_id) {
      return res.status(400).json({ error: 'Missing required fields: seat_numbers (array) and session_id' });
    }

    const reservation = await seatAvailabilityService.reserveSeatsTemporary(
      scheduleId, 
      seat_numbers, 
      session_id, 
      timeout_minutes
    );

    res.status(201).json(reservation);

  } catch (err) {
    console.error('❌ Error reserving seats:', err);
    
    if (err.message.includes('no longer available')) {
      return res.status(409).json({ error: err.message });
    }
    
    res.status(500).json({ error: 'Failed to reserve seats' });
  }
});

// Release temporary seat reservations
app.delete('/api/schedules/:id/reserve-seats', async (req, res) => {
  try {
    const scheduleId = Number(req.params.id);
    const { seat_numbers, session_id } = req.body;

    if (!scheduleId || !seat_numbers || !session_id) {
      return res.status(400).json({ error: 'Missing required fields: seat_numbers and session_id' });
    }

    await seatAvailabilityService.releaseSeatsTemporary(scheduleId, seat_numbers, session_id);
    res.status(204).end();

  } catch (err) {
    console.error('❌ Error releasing seat reservations:', err);
    res.status(500).json({ error: 'Failed to release seat reservations' });
  }
});

// Clean up expired reservations (can be called by admin or cron job)
app.post('/api/cleanup-expired-reservations', async (req, res) => {
  try {
    const result = await seatAvailabilityService.cleanupExpiredReservations();
    res.json(result);

  } catch (err) {
    console.error('❌ Error cleaning up reservations:', err);
    res.status(500).json({ error: 'Failed to cleanup expired reservations' });
  }
});

// ─── SCHEDULES ────────────────────────────────────────────────────────────────
// ─── FILTERED SCHEDULES ───────────────────────────────────────────────────────
app.get('/api/schedules', async (req, res) => {
  const { mode, from, to, date } = req.query;

  try {
    const conditions = [];
    const params = [];

    if (mode) {
      conditions.push(`LOWER(v.type) = LOWER($${params.length + 1})`);
      params.push(mode);
    }

    if (from) {
      conditions.push(`LOWER(os.city) LIKE LOWER($${params.length + 1})`);
      params.push(`${from.split(',')[0].trim()}%`);
    }

    if (to) {
      conditions.push(`LOWER(ds.city) LIKE LOWER($${params.length + 1})`);
      params.push(`${to.split(',')[0].trim()}%`);
    }

    if (date) {
      conditions.push(`DATE(s.departure_time) = $${params.length + 1}`);
      params.push(date);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const finalQuery = `
      SELECT 
        s.*,
        v.type AS vehicle_type,
        v.operator_name,
        r.origin_id,
        r.destination_id,
        v.capacity,
        os.name AS origin_name,
        os.city AS origin_city,
        ds.name AS destination_name,
        ds.city AS destination_city
      FROM schedules s
      JOIN routes r ON s.route_id = r.id
      JOIN vehicles v ON s.vehicle_id = v.id
      JOIN stations os ON r.origin_id = os.id
      JOIN stations ds ON r.destination_id = ds.id
      ${whereClause}
      ORDER BY s.departure_time
    `;

    const rows = await query(res, finalQuery, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching schedules:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/schedules/:id', async (req, res) => {
  try {
    const cols = Object.keys(req.body);
    const vals = Object.values(req.body);

    if (cols.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = cols.map((col, i) => `${col} = $${i + 1}`).join(', ');
    const updateQuery = `
      UPDATE schedules 
      SET ${setClause} 
      WHERE id = $${cols.length + 1} 
      RETURNING *
    `;

    const result = await query(res, updateQuery, [...vals, req.params.id]);
    res.json(result[0]);
  } catch (err) {
    console.error('Error updating schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.delete('/api/schedules/:id', async (req, res) => {
  try {
    await query(res, 'DELETE FROM schedules WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── VEHICLES ─────────────────────────────────────────────────────────────────
app.get('/api/vehicles', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM vehicles');
  res.json(rows);
});
app.get('/api/vehicles/:id', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM vehicles WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).end();
  res.json(rows[0]);
});
app.post('/api/vehicles', async (req, res) => {
  const { type, operator_name, capacity, plate_number, amenities, active } = req.body;
  const rows = await query(res,
    `INSERT INTO vehicles (type,operator_name,capacity,plate_number,amenities,active)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [type,operator_name,capacity,plate_number,amenities,active]
  );
  res.status(201).json(rows[0]);
});
app.put('/api/vehicles/:id', async (req, res) => {
  const cols = Object.keys(req.body), vals = Object.values(req.body);
  const set  = cols.map((c,i) => `${c}=$${i+1}`).join(',');
  const rows = await query(res,
    `UPDATE vehicles SET ${set} WHERE id=$${cols.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});
app.delete('/api/vehicles/:id', async (req, res) => {
  await query(res, 'DELETE FROM vehicles WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// ─── STATIONS ─────────────────────────────────────────────────────────────────
app.get('/api/stations', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM stations');
  res.json(rows);
});
app.get('/api/stations/:id', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM stations WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).end();
  res.json(rows[0]);
});
app.post('/api/stations', async (req, res) => {
  const { name, city, country, latitude, longitude } = req.body;
  const rows = await query(res,
    `INSERT INTO stations (name,city,country,latitude,longitude)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [name,city,country,latitude,longitude]
  );
  res.status(201).json(rows[0]);
});
app.put('/api/stations/:id', async (req, res) => {
  const cols = Object.keys(req.body), vals = Object.values(req.body);
  const set  = cols.map((c,i) => `${c}=$${i+1}`).join(',');
  const rows = await query(res,
    `UPDATE stations SET ${set} WHERE id=$${cols.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});
app.delete('/api/stations/:id', async (req, res) => {
  await query(res, 'DELETE FROM stations WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.get('/api/routes', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM routes');
  res.json(rows);
});
app.get('/api/routes/:id', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM routes WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).end();
  res.json(rows[0]);
});
app.post('/api/routes', async (req, res) => {
  const { origin_id, destination_id, distance_km, duration_minutes } = req.body;
  const rows = await query(res,
    `INSERT INTO routes (origin_id,destination_id,distance_km,duration_minutes)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [origin_id,destination_id,distance_km,duration_minutes]
  );
  res.status(201).json(rows[0]);
});
app.put('/api/routes/:id', async (req, res) => {
  const cols = Object.keys(req.body), vals = Object.values(req.body);
  const set  = cols.map((c,i) => `${c}=$${i+1}`).join(',');
  const rows = await query(res,
    `UPDATE routes SET ${set} WHERE id=$${cols.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});
app.delete('/api/routes/:id', async (req, res) => {
  await query(res, 'DELETE FROM routes WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// ─── TICKETS ──────────────────────────────────────────────────────────────────
app.get('/api/tickets', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM tickets');
  res.json(rows);
});
app.get('/api/tickets/:id', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM tickets WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).end();
  res.json(rows[0]);
});
app.post('/api/tickets', async (req, res) => {
  const { booking_id, ticket_code, qr_data } = req.body;
  const rows = await query(res,
    `INSERT INTO tickets (booking_id,ticket_code,qr_data)
     VALUES ($1,$2,$3) RETURNING *`,
    [booking_id,ticket_code,qr_data]
  );
  res.status(201).json(rows[0]);
});
app.put('/api/tickets/:id', async (req, res) => {
  const cols = Object.keys(req.body), vals = Object.values(req.body);
  const set  = cols.map((c,i) => `${c}=$${i+1}`).join(',');
  const rows = await query(res,
    `UPDATE tickets SET ${set} WHERE id=$${cols.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});
app.delete('/api/tickets/:id', async (req, res) => {
  await query(res, 'DELETE FROM tickets WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// ─── PAYMENTS (PRODUCTION LEVEL) ─────────────────────────────────────────────────────────────────
app.post('/api/payments/intent', optionalAuth, async (req, res) => {
  try {
    const { booking_id, amount, currency = 'myr', method = 'card', is_round_trip = false } = req.body;
    
    if (!booking_id) {
      return res.status(400).json({ error: 'Missing booking_id in request' });
    }

    // Use production booking service to create payment intent
    const result = await productionBookingService.createPaymentIntent(
      Number(booking_id), 
      is_round_trip || false
    );

    console.log(`✅ Payment intent created for booking ${booking_id}: ${result.client_secret.substring(0, 20)}...`);
    
    res.json({
      client_secret: result.client_secret,
      amount: result.amount
    });

  } catch (err) {
    console.error('❌ Payment intent creation failed:', err);
    
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    } else if (err.message.includes('already completed')) {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: `Failed to create payment intent: ${err.message}` });
  }
});

app.get('/api/payments', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM payments');
  res.json(rows);
});
app.get('/api/payments/:id', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM payments WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).end();
  res.json(rows[0]);
});
app.post('/api/payments', async (req, res) => {
  const { booking_id, amount, currency, method, status, transaction_id } = req.body;
  const rows = await query(res,
    `INSERT INTO payments (booking_id,amount,currency,method,status,transaction_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [booking_id,amount,currency,method,status,transaction_id]
  );
  res.status(201).json(rows[0]);
});
app.put('/api/payments/:id', async (req, res) => {
  const cols = Object.keys(req.body), vals = Object.values(req.body);
  const set  = cols.map((c,i) => `${c}=$${i+1}`).join(',');
  const rows = await query(res,
    `UPDATE payments SET ${set} WHERE id=$${cols.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});
app.delete('/api/payments/:id', async (req, res) => {
  await query(res, 'DELETE FROM payments WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// ─── FEEDBACK ─────────────────────────────────────────────────────────────────
app.get('/api/feedback', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM feedback');
  res.json(rows);
});
app.get('/api/feedback/:id', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM feedback WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).end();
  res.json(rows[0]);
});
app.post('/api/feedback', async (req, res) => {
  const { user_id, schedule_id, rating, comment } = req.body;
  const rows = await query(res,
    `INSERT INTO feedback (user_id,schedule_id,rating,comment)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [user_id,schedule_id,rating,comment]
  );
  res.status(201).json(rows[0]);
});
app.put('/api/feedback/:id', async (req, res) => {
  const cols = Object.keys(req.body), vals = Object.values(req.body);
  const set  = cols.map((c,i) => `${c}=$${i+1}`).join(',');
  const rows = await query(res,
    `UPDATE feedback SET ${set} WHERE id=$${cols.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});
app.delete('/api/feedback/:id', async (req, res) => {
  await query(res, 'DELETE FROM feedback WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// ─── PROMO_CODES ───────────────────────────────────────────────────────────────
app.get('/api/promo-codes', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM promo_codes');
  res.json(rows);
});
app.get('/api/promo-codes/:id', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM promo_codes WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).end();
  res.json(rows[0]);
});
app.post('/api/promo-codes', async (req, res) => {
  const { code, discount_percent, max_uses, expiry_date, is_active } = req.body;
  const rows = await query(res,
    `INSERT INTO promo_codes (code,discount_percent,max_uses,expiry_date,is_active)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [code,discount_percent,max_uses,expiry_date,is_active]
  );
  res.status(201).json(rows[0]);
});
app.put('/api/promo-codes/:id', async (req, res) => {
  const cols = Object.keys(req.body), vals = Object.values(req.body);
  const set  = cols.map((c,i) => `${c}=$${i+1}`).join(',');
  const rows = await query(res,
    `UPDATE promo_codes SET ${set} WHERE id=$${cols.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});
app.delete('/api/promo-codes/:id', async (req, res) => {
  await query(res, 'DELETE FROM promo_codes WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// ─── BOOKING_PROMOS ────────────────────────────────────────────────────────────
app.get('/api/booking-promos', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM booking_promos');
  res.json(rows);
});
app.get('/api/booking-promos/:id', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM booking_promos WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).end();
  res.json(rows[0]);
});
app.post('/api/booking-promos', async (req, res) => {
  const { booking_id, promo_id, discount_applied } = req.body;
  const rows = await query(res,
    `INSERT INTO booking_promos (booking_id,promo_id,discount_applied)
     VALUES ($1,$2,$3) RETURNING *`,
    [booking_id,promo_id,discount_applied]
  );
  res.status(201).json(rows[0]);
});
app.put('/api/booking-promos/:id', async (req, res) => {
  const cols = Object.keys(req.body), vals = Object.values(req.body);
  const set  = cols.map((c,i) => `${c}=$${i+1}`).join(',');
  const rows = await query(res,
    `UPDATE booking_promos SET ${set} WHERE id=$${cols.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});
app.delete('/api/booking-promos/:id', async (req, res) => {
  await query(res, 'DELETE FROM booking_promos WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// ─── INVOICES ─────────────────────────────────────────────────────────────────
app.get('/api/invoices', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM invoices');
  res.json(rows);
});
app.get('/api/invoices/:id', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM invoices WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).end();
  res.json(rows[0]);
});
app.post('/api/invoices', async (req, res) => {
  const { booking_id, invoice_number, pdf_url } = req.body;
  const rows = await query(res,
    `INSERT INTO invoices (booking_id,invoice_number,pdf_url)
     VALUES ($1,$2,$3) RETURNING *`,
    [booking_id,invoice_number,pdf_url]
  );
  res.status(201).json(rows[0]);
});
app.put('/api/invoices/:id', async (req, res) => {
  const cols = Object.keys(req.body), vals = Object.values(req.body);
  const set  = cols.map((c,i) => `${c}=$${i+1}`).join(',');
  const rows = await query(res,
    `UPDATE invoices SET ${set} WHERE id=$${cols.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});
app.delete('/api/invoices/:id', async (req, res) => {
  await query(res, 'DELETE FROM invoices WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
app.get('/api/notifications', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM notifications');
  res.json(rows);
});
app.get('/api/notifications/:id', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM notifications WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).end();
  res.json(rows[0]);
});
app.post('/api/notifications', async (req, res) => {
  const { user_id, type, message } = req.body;
  const rows = await query(res,
    `INSERT INTO notifications (user_id,type,message)
     VALUES ($1,$2,$3) RETURNING *`,
    [user_id,type,message]
  );
  res.status(201).json(rows[0]);
});
app.put('/api/notifications/:id', async (req, res) => {
  const cols = Object.keys(req.body), vals = Object.values(req.body);
  const set  = cols.map((c,i) => `${c}=$${i+1}`).join(',');
  const rows = await query(res,
    `UPDATE notifications SET ${set} WHERE id=$${cols.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});
app.delete('/api/notifications/:id', async (req, res) => {
  await query(res, 'DELETE FROM notifications WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// ─── REFERRALS ─────────────────────────────────────────────────────────────────
app.get('/api/referrals', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM referrals');
  res.json(rows);
});
app.get('/api/referrals/:id', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM referrals WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).end();
  res.json(rows[0]);
});
app.post('/api/referrals', async (req, res) => {
  const { referrer_id, referred_id, reward_amount } = req.body;
  const rows = await query(res,
    `INSERT INTO referrals (referrer_id,referred_id,reward_amount)
     VALUES ($1,$2,$3) RETURNING *`,
    [referrer_id,referred_id,reward_amount]
  );
  res.status(201).json(rows[0]);
});
app.put('/api/referrals/:id', async (req, res) => {
  const cols = Object.keys(req.body), vals = Object.values(req.body);
  const set  = cols.map((c,i) => `${c}=$${i+1}`).join(',');
  const rows = await query(res,
    `UPDATE referrals SET ${set} WHERE id=$${cols.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});
app.delete('/api/referrals/:id', async (req, res) => {
  await query(res, 'DELETE FROM referrals WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// ─── ADMIN_LOGS ────────────────────────────────────────────────────────────────
app.get('/api/admin-logs', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM admin_logs');
  res.json(rows);
});
app.get('/api/admin-logs/:id', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM admin_logs WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).end();
  res.json(rows[0]);
});
app.post('/api/admin-logs', async (req, res) => {
  const { admin_id, action, target_table, target_id } = req.body;
  const rows = await query(res,
    `INSERT INTO admin_logs (admin_id,action,target_table,target_id)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [admin_id,action,target_table,target_id]
  );
  res.status(201).json(rows[0]);
});
app.put('/api/admin-logs/:id', async (req, res) => {
  const cols = Object.keys(req.body), vals = Object.values(req.body);
  const set  = cols.map((c,i) => `${c}=$${i+1}`).join(',');
  const rows = await query(res,
    `UPDATE admin_logs SET ${set} WHERE id=$${cols.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});
app.delete('/api/admin-logs/:id', async (req, res) => {
  await query(res, 'DELETE FROM admin_logs WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// ─── BAGGAGE ──────────────────────────────────────────────────────────────────
app.get('/api/baggage', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM baggage');
  res.json(rows);
});
app.get('/api/baggage/:id', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM baggage WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).end();
  res.json(rows[0]);
});
app.post('/api/baggage', async (req, res) => {
  const { booking_id, weight_kg, type, is_checked_in } = req.body;
  const rows = await query(res,
    `INSERT INTO baggage (booking_id,weight_kg,type,is_checked_in)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [booking_id,weight_kg,type,is_checked_in]
  );
  res.status(201).json(rows[0]);
});
app.put('/api/baggage/:id', async (req, res) => {
  const cols = Object.keys(req.body), vals = Object.values(req.body);
  const set  = cols.map((c,i) => `${c}=$${i+1}`).join(',');
  const rows = await query(res,
    `UPDATE baggage SET ${set} WHERE id=$${cols.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});
app.delete('/api/baggage/:id', async (req, res) => {
  await query(res, 'DELETE FROM baggage WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// ─── REFRESH_TOKENS ───────────────────────────────────────────────────────────
app.get('/api/refresh-tokens', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM refresh_tokens');
  res.json(rows);
});
app.get('/api/refresh-tokens/:id', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM refresh_tokens WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).end();
  res.json(rows[0]);
});
app.post('/api/refresh-tokens', async (req, res) => {
  const { user_id, token, expires_at } = req.body;
  const rows = await query(res,
    `INSERT INTO refresh_tokens (user_id,token,expires_at)
     VALUES ($1,$2,$3) RETURNING *`,
    [user_id,token,expires_at]
  );
  res.status(201).json(rows[0]);
});
app.put('/api/refresh-tokens/:id', async (req, res) => {
  const cols = Object.keys(req.body), vals = Object.values(req.body);
  const set  = cols.map((c,i) => `${c}=$${i+1}`).join(',');
  const rows = await query(res,
    `UPDATE refresh_tokens SET ${set} WHERE id=$${cols.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});
app.delete('/api/refresh-tokens/:id', async (req, res) => {
  await query(res, 'DELETE FROM refresh_tokens WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// ─── VEHICLE_LOCATIONS ────────────────────────────────────────────────────────
app.get('/api/vehicle-locations', async (req, res) => {
  const rows = await query(res, 'SELECT * FROM vehicle_locations');
  res.json(rows);
});
app.get('/api/vehicle-locations/:id', async (req, res) => {

  const rows = await query(res, 'SELECT * FROM vehicle_locations WHERE vehicle_id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).end();
  res.json(rows[0]);
});
app.post('/api/vehicle-locations', async (req, res) => {
  const { vehicle_id, latitude, longitude } = req.body;
  const rows = await query(res,
    `INSERT INTO vehicle_locations (vehicle_id,latitude,longitude)
     VALUES ($1,$2,$3) RETURNING *`,
    [vehicle_id,latitude,longitude]
  );
  res.status(201).json(rows[0]);
});
// ─── VEHICLE_LOCATIONS (continued) ───────────────────────────────────────────────
app.put('/api/vehicle-locations/:id', async (req, res) => {
  const cols = Object.keys(req.body);
  const vals = Object.values(req.body);
  const set  = cols.map((c,i) => `${c}=$${i+1}`).join(',');
  const rows = await query(res,
    `UPDATE vehicle_locations SET ${set} WHERE vehicle_id=$${cols.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});

app.delete('/api/vehicle-locations/:id', async (req, res) => {
  await query(res,
    'DELETE FROM vehicle_locations WHERE vehicle_id = $1',
    [req.params.id]
  );
  res.status(204).end();
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('Transport API is running');
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

// ─── REVIEWS (Testimonials) ───────────────────────────────────────────────
import { body, validationResult } from 'express-validator';

// Middleware: require login
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Login required to post a review.' });
  }
  next();
}

// Middleware: prevent duplicate reviews (one per user per 24h)
async function preventDuplicateReview(req, res, next) {
  const userId = req.session.userId;
  const { review_text } = req.body;
  const { rows } = await pool.query(
    `SELECT * FROM reviews WHERE user_id = $1 AND review_text = $2 AND created_at > NOW() - INTERVAL '24 hours'`,
    [userId, review_text]
  );
  if (rows.length > 0) {
    return res.status(429).json({ error: 'You have already posted this review recently.' });
  }
  next();
}

// GET all reviews (latest first)
app.get('/api/reviews', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.id, r.name, r.location, r.review_text, r.created_at
     FROM reviews r
     ORDER BY r.created_at DESC LIMIT 100`
  );
  res.json(rows);
});

// POST a new review (login required, no spam, no duplicate)
app.post(
  '/api/reviews',
  requireAuth,
  body('review_text').isLength({ min: 10, max: 1000 }),
  preventDuplicateReview,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Review must be 10-1000 characters.' });
    }
    const userId = req.session.userId;
    // Get user info
    const userRes = await pool.query('SELECT first_name, last_name, city FROM users WHERE id = $1', [userId]);
    if (!userRes.rows.length) return res.status(401).json({ error: 'User not found.' });
    const { first_name, last_name, city } = userRes.rows[0];
    const name = `${first_name} ${last_name}`;
    const location = city || '';
    const { review_text } = req.body;
    const insertRes = await pool.query(
      `INSERT INTO reviews (user_id, name, location, review_text) VALUES ($1, $2, $3, $4) RETURNING id, name, location, review_text, created_at`,
      [userId, name, location, review_text]
    );
    res.status(201).json(insertRes.rows[0]);
  }
);

// PUT (edit) a review (only by owner, no duplicate, no spam)
app.put(
  '/api/reviews/:id',
  requireAuth,
  body('review_text').isLength({ min: 10, max: 1000 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Review must be 10-1000 characters.' });
    }
    const userId = req.session.userId;
    const { id } = req.params;
    const { review_text } = req.body;
    // Only allow editing own review
    const { rows } = await pool.query('SELECT * FROM reviews WHERE id = $1 AND user_id = $2', [id, userId]);
    if (!rows.length) return res.status(403).json({ error: 'Not allowed.' });
    // Prevent duplicate
    const { rows: dupRows } = await pool.query(
      `SELECT * FROM reviews WHERE user_id = $1 AND review_text = $2 AND id != $3 AND created_at > NOW() - INTERVAL '24 hours'`,
      [userId, review_text, id]
    );
    if (dupRows.length > 0) {
      return res.status(429).json({ error: 'You have already posted this review recently.' });
    }
    const updateRes = await pool.query(
      `UPDATE reviews SET review_text = $1 WHERE id = $2 RETURNING id, name, location, review_text, created_at`,
      [review_text, id]
    );
    res.json(updateRes.rows[0]);
  }
);

// DELETE a review (only by owner)
app.delete('/api/reviews/:id', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { id } = req.params;
  const { rows } = await pool.query('SELECT * FROM reviews WHERE id = $1 AND user_id = $2', [id, userId]);
  if (!rows.length) return res.status(403).json({ error: 'Not allowed.' });
  await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
  res.status(204).end();
});

// ─── WALLET & REWARDS (PRODUCTION LEVEL) ───────────────────────────────
// Get wallet info (balance, EasiPoints, saved cards)
app.get('/api/wallet', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // Fetch wallet balance and EasiPoints
    const walletRows = await pool.query(
      'SELECT wallet_balance, easipoints FROM users WHERE id = $1',
      [userId]
    );
    // Fetch saved cards (Stripe customer)
    let cards = [];
    const user = walletRows.rows[0];
    if (user && user.stripe_customer_id) {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripe_customer_id,
        type: 'card',
      });
      cards = paymentMethods.data.map(card => ({
        id: card.id,
        brand: card.card.brand,
        last4: card.card.last4,
        exp_month: card.card.exp_month,
        exp_year: card.card.exp_year,
      }));
    }
    res.json({
      wallet_balance: user.wallet_balance || 0,
      easipoints: user.easipoints || 0,
      cards,
    });
  } catch (err) {
    console.error('❌ Error fetching wallet info:', err);
    res.status(500).json({ error: 'Failed to fetch wallet info' });
  }
});

// Get wallet transaction history
app.get('/api/wallet/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await pool.query(
      'SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json(rows.rows);
  } catch (err) {
    console.error('❌ Error fetching wallet transactions:', err);
    res.status(500).json({ error: 'Failed to fetch wallet transactions' });
  }
});

// Top up wallet (Stripe, FPX, TNG)
app.post('/api/wallet/topup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, method, payment_method_id } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid amount' });
    if (!['card', 'fpx', 'tng'].includes(method)) return res.status(400).json({ error: 'Invalid method' });

    // Stripe card top-up
    if (method === 'card') {
      // Ensure user has a Stripe customer
      let userRow = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);
      let customerId = userRow.rows[0]?.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: { user_id: userId }
        });
        await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customer.id, userId]);
        customerId = customer.id;
      }
      // Create a PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'myr',
        customer: customerId,
        payment_method: payment_method_id,
        confirm: true,
        metadata: { user_id: userId, type: 'wallet_topup' },
      });
      // On success, update wallet and log transaction
      await pool.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [amount, userId]);
      await pool.query(
        'INSERT INTO wallet_transactions (user_id, type, amount, method, status, reference) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, 'topup', amount, 'card', 'success', paymentIntent.id]
      );
      return res.json({ success: true, wallet_balance: (await pool.query('SELECT wallet_balance FROM users WHERE id = $1', [userId])).rows[0].wallet_balance });
    }
    // FPX and TNG: Simulate or integrate with real payment gateway
    // For now, simulate success
    await pool.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [amount, userId]);
    await pool.query(
      'INSERT INTO wallet_transactions (user_id, type, amount, method, status, reference) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, 'topup', amount, method, 'success', 'simulated']
    );
    res.json({ success: true, wallet_balance: (await pool.query('SELECT wallet_balance FROM users WHERE id = $1', [userId])).rows[0].wallet_balance });
  } catch (err) {
    console.error('❌ Wallet top-up failed:', err);
    res.status(500).json({ error: 'Wallet top-up failed' });
  }
});

// Redeem EasiPoints for wallet credit
app.post('/api/wallet/redeem', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { points } = req.body;
    if (!points || points < 1) return res.status(400).json({ error: 'Invalid points' });
    // Assume 1 point = RM0.10
    const credit = points * 0.1;
    // Check user has enough points
    const userRow = await pool.query('SELECT easipoints FROM users WHERE id = $1', [userId]);
    if ((userRow.rows[0]?.easipoints || 0) < points) return res.status(400).json({ error: 'Not enough EasiPoints' });
    await pool.query('UPDATE users SET easipoints = easipoints - $1, wallet_balance = wallet_balance + $2 WHERE id = $3', [points, credit, userId]);
    await pool.query(
      'INSERT INTO wallet_transactions (user_id, type, amount, method, status, reference) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, 'redeem', credit, 'easipoints', 'success', 'easipoints']
    );
    res.json({ success: true, wallet_balance: (await pool.query('SELECT wallet_balance FROM users WHERE id = $1', [userId])).rows[0].wallet_balance });
  } catch (err) {
    console.error('❌ EasiPoints redemption failed:', err);
    res.status(500).json({ error: 'EasiPoints redemption failed' });
  }
});

// Remove a saved card (Stripe)
app.delete('/api/wallet/cards/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const cardId = req.params.id;
    // Fetch user's Stripe customer
    const userRow = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);
    const customerId = userRow.rows[0]?.stripe_customer_id;
    if (!customerId) return res.status(400).json({ error: 'No Stripe customer' });
    // Detach card
    await stripe.paymentMethods.detach(cardId);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Remove card failed:', err);
    res.status(500).json({ error: 'Remove card failed' });
  }
});

// Save a card to Stripe customer (no payment, just attach)
app.post('/api/wallet/cards', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { payment_method_id } = req.body;
    if (!payment_method_id) return res.status(400).json({ error: 'Missing payment_method_id' });
    // Fetch or create Stripe customer
    let userRow = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);
    let customerId = userRow.rows[0]?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { user_id: userId } });
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customer.id, userId]);
      customerId = customer.id;
    }
    // Attach payment method to customer
    await stripe.paymentMethods.attach(payment_method_id, { customer: customerId });
    // Set as default payment method
    await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: payment_method_id } });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Save card failed:', err);
    res.status(500).json({ error: 'Save card failed' });
  }
});
