export default class SeatAvailabilityService {
  constructor(pool) {
    this.pool = pool;
  }

  async getSeatAvailability(scheduleId) {
    const client = await this.pool.connect();
    try {
      const bookedSeatsResult = await client.query(`
        SELECT seat_number FROM bookings 
        WHERE schedule_id = $1 
        AND status IN ('booked', 'confirmed') 
        AND payment_status IN ('pending', 'paid')
      `, [scheduleId]);

      const bookedSeats = [];
      bookedSeatsResult.rows.forEach(row => {
        if (row.seat_number?.includes(',')) {
          bookedSeats.push(...row.seat_number.split(',').map(s => s.trim()));
        } else if (row.seat_number) {
          bookedSeats.push(row.seat_number.trim());
        }
      });

      const reservedSeatsResult = await client.query(`
        SELECT seat_number FROM seat_reservations 
        WHERE schedule_id = $1 AND expires_at > NOW()
      `, [scheduleId]);

      const reservedSeats = reservedSeatsResult.rows.map(row => row.seat_number);
      const allUnavailableSeats = [...bookedSeats, ...reservedSeats];

      return {
        schedule_id: scheduleId,
        booked_seats: bookedSeats,
        reserved_seats: reservedSeats,
        unavailable_seats: allUnavailableSeats,
        last_updated: new Date().toISOString()
      };
    } catch (err) {
      console.error("❌ getSeatAvailability error:", err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  async reserveSeatsTemporary(scheduleId, seatNumbers, sessionId, timeoutMinutes = 10) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const availability = await this.getSeatAvailability(scheduleId);
      const conflicts = seatNumbers.filter(s => availability.unavailable_seats.includes(s.toString()));
      if (conflicts.length > 0) {
        await client.query("ROLLBACK");
        throw new Error(`Seats ${conflicts.join(", ")} are already taken`);
      }

      const expiresAt = new Date(Date.now() + timeoutMinutes * 60000);

      for (const seat of seatNumbers) {
        await client.query(`
          INSERT INTO seat_reservations (schedule_id, seat_number, session_id, expires_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (schedule_id, seat_number)
          DO UPDATE SET session_id = $3, expires_at = $4
        `, [scheduleId, seat.toString(), sessionId, expiresAt]);
      }

      await client.query("COMMIT");
      return { reserved: true, expires_at: expiresAt, seats: seatNumbers };
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ reserveSeatsTemporary error:", err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  async releaseSeatsTemporary(scheduleId, seatNumbers, sessionId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        DELETE FROM seat_reservations 
        WHERE schedule_id = $1 AND seat_number = ANY($2::text[]) AND session_id = $3
      `, [scheduleId, seatNumbers.map(s => s.toString()), sessionId]);

      return { released: true, count: result.rowCount };
    } catch (err) {
      console.error("❌ releaseSeatsTemporary error:", err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  async cleanupExpiredReservations() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`DELETE FROM seat_reservations WHERE expires_at < NOW()`);
      return { cleaned: result.rowCount };
    } catch (err) {
      console.error("❌ cleanupExpiredReservations error:", err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  async getSeatLayoutWithAvailability(scheduleId, vehicleType = 'bus') {
    try {
      const availability = await this.getSeatAvailability(scheduleId);
      const layout = this.generateSeatLayout(vehicleType);

      layout.forEach(seat => {
        const id = seat.seatNumber.toString();
        if (availability.booked_seats.includes(id) || availability.booked_seats.includes(seat.label)) {
          seat.status = 'booked';
        } else if (availability.reserved_seats.includes(id) || availability.reserved_seats.includes(seat.label)) {
          seat.status = 'reserved';
        }
      });

      return {
        seats: layout,
        booked_count: availability.booked_seats.length,
        reserved_count: availability.reserved_seats.length,
        available_count: layout.filter(s => s.status === "available").length,
        last_updated: availability.last_updated
      };
    } catch (err) {
      console.error("❌ getSeatLayoutWithAvailability error:", err.message);
      throw err;
    }
  }

  generateSeatLayout(vehicleType) {
    const seats = [];
    let seatNumber = 1;

    if (vehicleType === "bus") {
      for (let row = 1; row <= 25; row++) {
        for (let col = 0; col < 4; col++) {
          if (col === 2) continue;
          const label = `${row}${["A", "B", "C", "D"][col]}`;
          let className = "Economy", price = 30;
          if (seatNumber <= 12) { className = "Premium"; price = 80; }
          else if (seatNumber <= 72) { className = "Standard"; price = 50; }

          seats.push({ seatNumber, label, status: "available", price, className });
          seatNumber++;
        }
      }
    } else if (vehicleType === "train") {
      for (let row = 1; row <= 35; row++) {
        for (let col = 0; col < 11; col++) {
          if (col === 5) continue;
          const label = `${row}${"ABCDEFGHIJK"[col]}`;
          let className = "Economy Class", price = 60;
          if (seatNumber <= 50) { className = "First Class"; price = 200; }
          else if (seatNumber <= 170) { className = "Second Class"; price = 120; }

          seats.push({ seatNumber, label, status: "available", price, className });
          seatNumber++;
        }
      }
    } else if (vehicleType === "ferry") {
      for (let r = 0; r < 85 && seatNumber <= 338; r++) {
        for (let c = 1; c <= 4; c++) {
          const label = `${String.fromCharCode(65 + Math.floor(r / 4))}${c}`;
          let className = "Economy Class", price = 40;
          if (seatNumber <= 48) { className = "Premium Class"; price = 150; }
          else if (seatNumber <= 138) { className = "Business Class"; price = 100; }

          seats.push({ seatNumber, label, status: "available", price, className });
          seatNumber++;
        }
      }
    }

    return seats;
  }

  async markSeatsAsBooked(scheduleId, seatNumbers) {
    const client = await this.pool.connect();
    try {
      await client.query(`
        DELETE FROM seat_reservations 
        WHERE schedule_id = $1 AND seat_number = ANY($2::text[])
      `, [scheduleId, seatNumbers.map(s => s.toString())]);

      return { success: true };
    } catch (err) {
      console.error(" markSeatsAsBooked error:", err.message);
      throw err;
    } finally {
      client.release();
    }
  }
}
