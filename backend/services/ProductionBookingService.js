// ProductionBookingService.js - Production-level booking management
export default class ProductionBookingService {
  constructor(pool, stripe) {
    this.pool = pool;
    this.stripe = stripe;
  }

  /**
   * Create a one-way booking with multiple seats
   */
  async createOneWayBooking(bookingData) {
    const { 
      schedule_id, 
      seat_numbers, // Array of seat numbers
      passenger_info,
      user_id = null,
      guest_id = null,
      extras = { luggage: 0, co2: false, insurance: false },
      promo_code = null
    } = bookingData;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Validate schedule exists and is available
      const scheduleResult = await client.query(
        'SELECT id, price, available_seats, status FROM schedules WHERE id = $1',
        [schedule_id]
      );

      if (scheduleResult.rows.length === 0) {
        throw new Error('Schedule not found');
      }

      const schedule = scheduleResult.rows[0];
      if (schedule.status !== 'scheduled') {
        throw new Error('Schedule is not available for booking');
      }

      if (schedule.available_seats < seat_numbers.length) {
        throw new Error('Not enough seats available');
      }

      // 2. Check seat availability
      for (const seatNumber of seat_numbers) {
        const seatCheck = await client.query(
          `SELECT id FROM bookings 
           WHERE schedule_id = $1 AND seat_number LIKE $2 AND status != 'cancelled'`,
          [schedule_id, `%${seatNumber}%`]
        );

        if (seatCheck.rows.length > 0) {
          throw new Error(`Seat ${seatNumber} is already booked`);
        }
      }

      // 3. Create booking with multiple seats
      const seatString = seat_numbers.join(',');
      const basePrice = parseFloat(schedule.price);
      const totalSeatPrice = basePrice * seat_numbers.length;
      
      // Calculate extras
      const extrasPrice = this.calculateExtrasPrice(extras);
      const totalPrice = totalSeatPrice + extrasPrice;

      // Apply promo code discount if applicable
      let discountAmount = 0;
      if (promo_code) {
        discountAmount = await this.calculatePromoDiscount(promo_code, totalPrice, client);
      }

      const finalPrice = totalPrice - discountAmount;

      const bookingResult = await client.query(
        `INSERT INTO bookings (
          user_id, guest_id, schedule_id, seat_number, 
          status, payment_status, total_price,
          extra_luggage, offset_co2, add_insurance, promo_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          user_id, guest_id, schedule_id, seatString,
          'booked', 'pending', finalPrice,
          extras.luggage || 0, extras.co2 || false, extras.insurance || false,
          promo_code
        ]
      );

      // 4. Update available seats
      await client.query(
        'UPDATE schedules SET available_seats = available_seats - $1 WHERE id = $2',
        [seat_numbers.length, schedule_id]
      );

      // 5. Create guest record if needed
      if (!user_id && passenger_info) {
        const guestResult = await client.query(
          `INSERT INTO guests (first_name, last_name, email, phone)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           phone = EXCLUDED.phone
           RETURNING id`,
          [passenger_info.firstName, passenger_info.lastName, passenger_info.email, passenger_info.phone]
        );

        // Update booking with guest_id
        await client.query(
          'UPDATE bookings SET guest_id = $1 WHERE id = $2',
          [guestResult.rows[0].id, bookingResult.rows[0].id]
        );
      }

      await client.query('COMMIT');

      return {
        success: true,
        booking: bookingResult.rows[0],
        seat_count: seat_numbers.length,
        total_price: finalPrice,
        discount_applied: discountAmount
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ createOneWayBooking error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a round-trip booking
   */
  async createRoundTripBooking(bookingData) {
    const { outbound, returnTrip, passenger_info, user_id = null, extras = {}, promo_code = null } = bookingData;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create guest if needed
      let guest_id = null;
      if (!user_id && passenger_info) {
        const guestResult = await client.query(
          `INSERT INTO guests (first_name, last_name, email, phone)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           phone = EXCLUDED.phone
           RETURNING id`,
          [passenger_info.firstName, passenger_info.lastName, passenger_info.email, passenger_info.phone]
        );
        guest_id = guestResult.rows[0].id;
      }

      // Create outbound booking
      const outboundBooking = await this.createSingleBooking(
        outbound, user_id, guest_id, extras, client
      );

      // Create return booking
      const returnBooking = await this.createSingleBooking(
        returnTrip, user_id, guest_id, extras, client
      );

      // Calculate total price
      const totalPrice = outboundBooking.total_price + returnBooking.total_price;
      
      // Apply promo discount to total
      let discountAmount = 0;
      if (promo_code) {
        discountAmount = await this.calculatePromoDiscount(promo_code, totalPrice, client);
        
        // Update both bookings with discount proportionally
        const outboundDiscount = (outboundBooking.total_price / totalPrice) * discountAmount;
        const returnDiscount = (returnBooking.total_price / totalPrice) * discountAmount;
        
        await client.query(
          'UPDATE bookings SET total_price = total_price - $1, promo_code = $2 WHERE id = $3',
          [outboundDiscount, promo_code, outboundBooking.id]
        );
        
        await client.query(
          'UPDATE bookings SET total_price = total_price - $1, promo_code = $2 WHERE id = $3',
          [returnDiscount, promo_code, returnBooking.id]
        );
      }

      // Create round-trip record
      const roundTripResult = await client.query(
        `INSERT INTO round_trip_bookings (outbound_booking_id, return_booking_id)
         VALUES ($1, $2) RETURNING id`,
        [outboundBooking.id, returnBooking.id]
      );

      await client.query('COMMIT');

      return {
        success: true,
        id: roundTripResult.rows[0].id,
        outbound_booking_id: outboundBooking.id,
        return_booking_id: returnBooking.id,
        total_price: totalPrice - discountAmount,
        discount_applied: discountAmount
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ createRoundTripBooking error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Helper: Create a single booking (used by round-trip)
   */
  async createSingleBooking(tripData, user_id, guest_id, extras, client) {
    const { schedule_id, seat_numbers } = tripData;

    // Validate schedule
    const scheduleResult = await client.query(
      'SELECT id, price, available_seats, status FROM schedules WHERE id = $1',
      [schedule_id]
    );

    if (scheduleResult.rows.length === 0) {
      throw new Error(`Schedule ${schedule_id} not found`);
    }

    const schedule = scheduleResult.rows[0];
    if (schedule.status !== 'scheduled') {
      throw new Error(`Schedule ${schedule_id} is not available`);
    }

    // Check seat availability
    for (const seatNumber of seat_numbers) {
      const seatCheck = await client.query(
        `SELECT id FROM bookings 
         WHERE schedule_id = $1 AND seat_number LIKE $2 AND status != 'cancelled'`,
        [schedule_id, `%${seatNumber}%`]
      );

      if (seatCheck.rows.length > 0) {
        throw new Error(`Seat ${seatNumber} is already booked on schedule ${schedule_id}`);
      }
    }

    // Calculate price
    const seatString = seat_numbers.join(',');
    const basePrice = parseFloat(schedule.price);
    const totalSeatPrice = basePrice * seat_numbers.length;
    const extrasPrice = this.calculateExtrasPrice(extras);
    const totalPrice = totalSeatPrice + extrasPrice;

    // Create booking
    const bookingResult = await client.query(
      `INSERT INTO bookings (
        user_id, guest_id, schedule_id, seat_number, 
        status, payment_status, total_price,
        extra_luggage, offset_co2, add_insurance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        user_id, guest_id, schedule_id, seatString,
        'booked', 'pending', totalPrice,
        extras.luggage || 0, extras.co2 || false, extras.insurance || false
      ]
    );

    // Update available seats
    await client.query(
      'UPDATE schedules SET available_seats = available_seats - $1 WHERE id = $2',
      [seat_numbers.length, schedule_id]
    );

    return bookingResult.rows[0];
  }

  /**
   * Create Stripe payment intent
   */
  async createPaymentIntent(bookingId, isRoundTrip = false) {
    const client = await this.pool.connect();
    try {
      let totalAmount = 0;
      let bookingExists = false;

      if (isRoundTrip) {
        // Get round-trip booking total
        const result = await client.query(`
          SELECT 
            (ob.total_price + rb.total_price) as total_amount,
            ob.payment_status as outbound_payment,
            rb.payment_status as return_payment
          FROM round_trip_bookings rtb
          JOIN bookings ob ON rtb.outbound_booking_id = ob.id
          JOIN bookings rb ON rtb.return_booking_id = rb.id
          WHERE rtb.id = $1
        `, [bookingId]);

        if (result.rows.length > 0) {
          totalAmount = parseFloat(result.rows[0].total_amount);
          bookingExists = true;

          // Check if already paid
          if (result.rows[0].outbound_payment === 'paid' && result.rows[0].return_payment === 'paid') {
            throw new Error('Payment already completed for this booking');
          }
        }
      } else {
        // Get regular booking total
        const result = await client.query(
          'SELECT total_price, payment_status FROM bookings WHERE id = $1',
          [bookingId]
        );

        if (result.rows.length > 0) {
          totalAmount = parseFloat(result.rows[0].total_price);
          bookingExists = true;

          if (result.rows[0].payment_status === 'paid') {
            throw new Error('Payment already completed for this booking');
          }
        }
      }

      if (!bookingExists) {
        throw new Error('Booking not found');
      }

      // Create Stripe payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: 'myr',
        payment_method_types: ['card'],
        metadata: {
          booking_id: bookingId.toString(),
          is_round_trip: isRoundTrip.toString()
        }
      });

      // Log payment intent
      await client.query(
        'INSERT INTO payments (booking_id, amount, currency, method, transaction_id, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [bookingId, totalAmount, 'myr', 'card', paymentIntent.id, 'created']
      );

      return {
        client_secret: paymentIntent.client_secret,
        amount: totalAmount
      };

    } finally {
      client.release();
    }
  }

  /**
   * Process successful payment
   */
  async processSuccessfulPayment(paymentIntentId, bookingId, isRoundTrip = false) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      if (isRoundTrip) {
        // Update round-trip booking payments
        await client.query(`
          UPDATE bookings SET payment_status = 'paid', status = 'confirmed'
          WHERE id IN (
            SELECT outbound_booking_id FROM round_trip_bookings WHERE id = $1
            UNION
            SELECT return_booking_id FROM round_trip_bookings WHERE id = $1
          )
        `, [bookingId]);
      } else {
        // Update regular booking payment
        await client.query(
          'UPDATE bookings SET payment_status = $1, status = $2 WHERE id = $3',
          ['paid', 'confirmed', bookingId]
        );
      }

      // Update payment record
      await client.query(
        'UPDATE payments SET status = $1 WHERE transaction_id = $2',
        ['completed', paymentIntentId]
      );

      await client.query('COMMIT');

      return { success: true };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ processSuccessfulPayment error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get booking details for success page
   */
  async getBookingDetails(bookingId, isRoundTrip = false) {
    const client = await this.pool.connect();
    try {
      if (isRoundTrip) {
        // Get round-trip booking details
        const result = await client.query(`
          SELECT 
            rtb.id,
            ob.id as outbound_id, ob.seat_number as outbound_seats, ob.total_price as outbound_price,
            rb.id as return_id, rb.seat_number as return_seats, rb.total_price as return_price,
            os1.departure_time as outbound_departure, os2.departure_time as return_departure,
            ost1.city as outbound_from, dst1.city as outbound_to,
            ost2.city as return_from, dst2.city as return_to,
            COALESCE(u.name, g.first_name || ' ' || g.last_name) as passenger_name,
            COALESCE(u.email, g.email) as passenger_email,
            COALESCE(u.phone_number, g.phone) as passenger_phone,
            ob.extra_luggage, ob.offset_co2, ob.add_insurance, ob.promo_code
          FROM round_trip_bookings rtb
          JOIN bookings ob ON rtb.outbound_booking_id = ob.id
          JOIN bookings rb ON rtb.return_booking_id = rb.id
          JOIN schedules os1 ON ob.schedule_id = os1.id
          JOIN schedules os2 ON rb.schedule_id = os2.id
          JOIN routes or1 ON os1.route_id = or1.id
          JOIN routes or2 ON os2.route_id = or2.id
          JOIN stations ost1 ON or1.origin_id = ost1.id
          JOIN stations dst1 ON or1.destination_id = dst1.id
          JOIN stations ost2 ON or2.origin_id = ost2.id
          JOIN stations dst2 ON or2.destination_id = dst2.id
          LEFT JOIN users u ON ob.user_id = u.id
          LEFT JOIN guests g ON ob.guest_id = g.id
          WHERE rtb.id = $1
        `, [bookingId]);

        if (result.rows.length === 0) {
          throw new Error('Round-trip booking not found');
        }

        const booking = result.rows[0];
        return {
          id: booking.id,
          is_round_trip: true,
          passenger_name: booking.passenger_name,
          passenger_email: booking.passenger_email,
          passenger_phone: booking.passenger_phone,
          trips: [
            {
              from_location: booking.outbound_from,
              to_location: booking.outbound_to,
              travel_date: booking.outbound_departure,
              seats: booking.outbound_seats.split(','),
              price: parseFloat(booking.outbound_price),
              qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?data=BOOKING-${booking.outbound_id}&size=200x200`
            },
            {
              from_location: booking.return_from,
              to_location: booking.return_to,
              travel_date: booking.return_departure,
              seats: booking.return_seats.split(','),
              price: parseFloat(booking.return_price),
              qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?data=BOOKING-${booking.return_id}&size=200x200`
            }
          ],
          total_paid: parseFloat(booking.outbound_price) + parseFloat(booking.return_price),
          extra_luggage: booking.extra_luggage,
          offset_co2: booking.offset_co2,
          add_insurance: booking.add_insurance,
          promo_code: booking.promo_code
        };
      } else {
        // Get regular booking details
        const result = await client.query(`
          SELECT 
            b.*, s.departure_time, s.arrival_time,
            os.city as from_location, ds.city as to_location,
            COALESCE(u.name, g.first_name || ' ' || g.last_name) as passenger_name,
            COALESCE(u.email, g.email) as passenger_email,
            COALESCE(u.phone_number, g.phone) as passenger_phone
          FROM bookings b
          JOIN schedules s ON b.schedule_id = s.id
          JOIN routes r ON s.route_id = r.id
          JOIN stations os ON r.origin_id = os.id
          JOIN stations ds ON r.destination_id = ds.id
          LEFT JOIN users u ON b.user_id = u.id
          LEFT JOIN guests g ON b.guest_id = g.id
          WHERE b.id = $1
        `, [bookingId]);

        if (result.rows.length === 0) {
          throw new Error('Booking not found');
        }

        const booking = result.rows[0];
        return {
          id: booking.id,
          is_round_trip: false,
          passenger_name: booking.passenger_name,
          passenger_email: booking.passenger_email,
          passenger_phone: booking.passenger_phone,
          trips: [{
            from_location: booking.from_location,
            to_location: booking.to_location,
            travel_date: booking.departure_time,
            seats: booking.seat_number.split(','),
            price: parseFloat(booking.total_price),
            qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?data=BOOKING-${booking.id}&size=200x200`
          }],
          total_paid: parseFloat(booking.total_price),
          extra_luggage: booking.extra_luggage,
          offset_co2: booking.offset_co2,
          add_insurance: booking.add_insurance,
          promo_code: booking.promo_code
        };
      }
    } finally {
      client.release();
    }
  }

  /**
   * Calculate extras pricing
   */
  calculateExtrasPrice(extras) {
    let total = 0;
    if (extras.luggage) total += extras.luggage * 5.49;
    if (extras.co2) total += 0.57;
    if (extras.insurance) total += 2.49;
    return total;
  }

  /**
   * Calculate promo code discount
   */
  async calculatePromoDiscount(promoCode, totalPrice, client) {
    const promoResult = await client.query(
      'SELECT discount_percent, max_uses, is_active FROM promo_codes WHERE code = $1 AND expiry_date > NOW()',
      [promoCode]
    );

    if (promoResult.rows.length === 0 || !promoResult.rows[0].is_active) {
      return 0;
    }

    const promo = promoResult.rows[0];
    return totalPrice * (promo.discount_percent / 100);
  }

  /**
   * Create a one-way booking after payment (production logic)
   */
  async createOneWayBookingAfterPayment(bookingData) {
    const { schedule_id, seat_numbers, passenger_info, user_id = null, extras = {}, promo_code = null } = bookingData;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Validate schedule
      const scheduleResult = await client.query(
        'SELECT id, price, available_seats, status FROM schedules WHERE id = $1',
        [schedule_id]
      );
      if (scheduleResult.rows.length === 0) {
        throw new Error('Schedule not found');
      }
      const schedule = scheduleResult.rows[0];
      if (schedule.status !== 'scheduled') {
        throw new Error('Schedule is not available for booking');
      }
      if (schedule.available_seats < seat_numbers.length) {
        throw new Error('Not enough seats available');
      }
      // Check seat availability (should be available after payment)
      for (const seatNumber of seat_numbers) {
        const seatCheck = await client.query(
          `SELECT id FROM bookings 
           WHERE schedule_id = $1 AND seat_number LIKE $2 AND status != 'cancelled'`,
          [schedule_id, `%${seatNumber}%`]
        );
        if (seatCheck.rows.length > 0) {
          throw new Error(`Seat ${seatNumber} is already booked`);
        }
      }
      // Create booking
      const seatString = seat_numbers.join(',');
      const basePrice = parseFloat(schedule.price);
      const totalSeatPrice = basePrice * seat_numbers.length;
      const extrasPrice = this.calculateExtrasPrice(extras);
      const totalPrice = totalSeatPrice + extrasPrice;
      let discountAmount = 0;
      if (promo_code) {
        discountAmount = await this.calculatePromoDiscount(promo_code, totalPrice, client);
      }
      const finalPrice = totalPrice - discountAmount;
      const bookingResult = await client.query(
        `INSERT INTO bookings (
          user_id, schedule_id, seat_number, 
          status, payment_status, total_price,
          extra_luggage, offset_co2, add_insurance, promo_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          user_id, schedule_id, seatString,
          'booked', 'paid', finalPrice,
          extras.luggage || 0, extras.co2 || false, extras.insurance || false,
          promo_code
        ]
      );
      await client.query(
        'UPDATE schedules SET available_seats = available_seats - $1 WHERE id = $2',
        [seat_numbers.length, schedule_id]
      );
      await client.query('COMMIT');
      return {
        success: true,
        booking: bookingResult.rows[0],
        seat_count: seat_numbers.length,
        total_price: finalPrice,
        discount_applied: discountAmount
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ createOneWayBookingAfterPayment error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a round-trip booking after payment (production logic)
   */
  async createRoundTripBookingAfterPayment(bookingData) {
    const { outbound, returnTrip, passenger_info, user_id = null, extras = {}, promo_code = null } = bookingData;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Create guest if needed
      let guest_id = null;
      if (!user_id && passenger_info) {
        const guestResult = await client.query(
          `INSERT INTO guests (first_name, last_name, email, phone)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           phone = EXCLUDED.phone
           RETURNING id`,
          [passenger_info.firstName, passenger_info.lastName, passenger_info.email, passenger_info.phone]
        );
        guest_id = guestResult.rows[0].id;
      }
      // Create outbound booking
      const outboundBooking = await this.createSingleBooking(
        outbound, user_id, guest_id, extras, client
      );
      // Create return booking
      const returnBooking = await this.createSingleBooking(
        returnTrip, user_id, guest_id, extras, client
      );
      // Calculate total price
      const totalPrice = outboundBooking.total_price + returnBooking.total_price;
      // Apply promo discount to total
      let discountAmount = 0;
      if (promo_code) {
        discountAmount = await this.calculatePromoDiscount(promo_code, totalPrice, client);
        // Update both bookings with discount proportionally
        const outboundDiscount = (outboundBooking.total_price / totalPrice) * discountAmount;
        const returnDiscount = (returnBooking.total_price / totalPrice) * discountAmount;
        await client.query(
          'UPDATE bookings SET total_price = total_price - $1, promo_code = $2 WHERE id = $3',
          [outboundDiscount, promo_code, outboundBooking.id]
        );
        await client.query(
          'UPDATE bookings SET total_price = total_price - $1, promo_code = $2 WHERE id = $3',
          [returnDiscount, promo_code, returnBooking.id]
        );
      }
      // Create round-trip record
      const roundTripResult = await client.query(
        `INSERT INTO round_trip_bookings (outbound_booking_id, return_booking_id)
         VALUES ($1, $2) RETURNING id`,
        [outboundBooking.id, returnBooking.id]
      );
      await client.query('COMMIT');
      return {
        success: true,
        id: roundTripResult.rows[0].id,
        outbound_booking_id: outboundBooking.id,
        return_booking_id: returnBooking.id,
        total_price: totalPrice - discountAmount,
        discount_applied: discountAmount
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ createRoundTripBookingAfterPayment error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}
