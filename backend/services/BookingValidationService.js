/**
 * Booking Validation Service
 * Handles complex validation logic for bookings and payments
 */

export default class BookingValidationService {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Validate seat availability before booking
   */
  async validateSeatAvailability(scheduleId, seatNumbers) {
    const client = await this.pool.connect();
    try {
      const seatArray = Array.isArray(seatNumbers) ? seatNumbers : [seatNumbers];
      
      for (const seat of seatArray) {
        const result = await client.query(
          `SELECT id FROM bookings 
           WHERE schedule_id = $1 AND seat_number LIKE $2 AND status != 'cancelled'`,
          [scheduleId, `%${seat}%`]
        );
        
        if (result.rows.length > 0) {
          return {
            valid: false,
            error: `Seat ${seat} is already booked for this schedule`,
            conflictingSeat: seat
          };
        }
      }
      
      return { valid: true };
    } finally {
      client.release();
    }
  }

  /**
   * Validate round-trip booking data
   */
  async validateRoundTripBooking(outbound, returnTrip) {
    const errors = [];

    // Validate outbound trip
    if (!outbound?.schedule_id || !outbound?.seat_number) {
      errors.push('Outbound trip information is incomplete');
    }

    // Validate return trip
    if (!returnTrip?.schedule_id || !returnTrip?.seat_number) {
      errors.push('Return trip information is incomplete');
    }

    // Check if schedules exist and are available
    const client = await this.pool.connect();
    try {
      for (const trip of [outbound, returnTrip]) {
        if (trip?.schedule_id) {
          const scheduleResult = await client.query(
            'SELECT id, status, available_seats FROM schedules WHERE id = $1',
            [trip.schedule_id]
          );
          
          if (scheduleResult.rows.length === 0) {
            errors.push(`Schedule ${trip.schedule_id} not found`);
          } else if (scheduleResult.rows[0].status !== 'scheduled') {
            errors.push(`Schedule ${trip.schedule_id} is not available for booking`);
          } else if (scheduleResult.rows[0].available_seats <= 0) {
            errors.push(`Schedule ${trip.schedule_id} has no available seats`);
          }
        }
      }
    } finally {
      client.release();
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate payment amount against booking
   */
  async validatePaymentAmount(bookingId, expectedAmount, isRoundTrip = false) {
    const client = await this.pool.connect();
    try {
      let totalPrice = 0;

      if (isRoundTrip) {
        // Calculate total for round-trip booking
        const result = await client.query(`
          SELECT 
            (SELECT price FROM schedules WHERE id = rtb.outbound_booking_id) +
            (SELECT price FROM schedules WHERE id = rtb.return_booking_id) as total_price
          FROM round_trip_bookings rtb
          WHERE rtb.id = $1
        `, [bookingId]);
        
        if (result.rows.length === 0) {
          return { valid: false, error: 'Round-trip booking not found' };
        }
        
        totalPrice = parseFloat(result.rows[0].total_price);
      } else {
        // Calculate total for regular booking
        const result = await client.query(`
          SELECT s.price, b.seat_number
          FROM bookings b
          JOIN schedules s ON b.schedule_id = s.id
          WHERE b.id = $1
        `, [bookingId]);
        
        if (result.rows.length === 0) {
          return { valid: false, error: 'Booking not found' };
        }
        
        const seatCount = result.rows[0].seat_number.includes(',') 
          ? result.rows[0].seat_number.split(',').length 
          : 1;
        totalPrice = parseFloat(result.rows[0].price) * seatCount;
      }

      const tolerance = 0.01; // Allow 1 cent difference for rounding
      const amountDifference = Math.abs(expectedAmount - totalPrice);
      
      return {
        valid: amountDifference <= tolerance,
        calculatedAmount: totalPrice,
        providedAmount: expectedAmount,
        error: amountDifference > tolerance 
          ? `Payment amount mismatch. Expected: ${totalPrice}, Provided: ${expectedAmount}`
          : null
      };
    } finally {
      client.release();
    }
  }

  /**
   * Check if booking can accept payment
   */
  async validateBookingForPayment(bookingId, isRoundTrip = false) {
    const client = await this.pool.connect();
    try {
      if (isRoundTrip) {
        // Check round-trip booking status
        const result = await client.query(`
          SELECT rtb.id, 
                 ob.payment_status as outbound_payment_status,
                 rb.payment_status as return_payment_status,
                 ob.status as outbound_status,
                 rb.status as return_status
          FROM round_trip_bookings rtb
          JOIN bookings ob ON rtb.outbound_booking_id = ob.id
          JOIN bookings rb ON rtb.return_booking_id = rb.id
          WHERE rtb.id = $1
        `, [bookingId]);
        
        if (result.rows.length === 0) {
          return { valid: false, error: 'Round-trip booking not found' };
        }
        
        const booking = result.rows[0];
        
        if (booking.outbound_payment_status === 'paid' || booking.return_payment_status === 'paid') {
          return { valid: false, error: 'Payment already completed for this booking' };
        }
        
        if (booking.outbound_status === 'cancelled' || booking.return_status === 'cancelled') {
          return { valid: false, error: 'Cannot process payment for cancelled booking' };
        }
      } else {
        // Check regular booking status
        const result = await client.query(
          'SELECT payment_status, status FROM bookings WHERE id = $1',
          [bookingId]
        );
        
        if (result.rows.length === 0) {
          return { valid: false, error: 'Booking not found' };
        }
        
        const booking = result.rows[0];
        
        if (booking.payment_status === 'paid') {
          return { valid: false, error: 'Payment already completed for this booking' };
        }
        
        if (booking.status === 'cancelled') {
          return { valid: false, error: 'Cannot process payment for cancelled booking' };
        }
      }
      
      return { valid: true };
    } finally {
      client.release();
    }
  }
}
