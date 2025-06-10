-- Create seat_reservations table for temporary seat holds during booking
CREATE TABLE IF NOT EXISTS seat_reservations (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  session_id TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one reservation per seat per schedule
  UNIQUE(schedule_id, seat_number)
);

-- Index for efficient cleanup of expired reservations
CREATE INDEX IF NOT EXISTS idx_seat_reservations_expires_at ON seat_reservations(expires_at);

-- Index for efficient lookup by schedule
CREATE INDEX IF NOT EXISTS idx_seat_reservations_schedule_id ON seat_reservations(schedule_id);

-- Index for session-based operations
CREATE INDEX IF NOT EXISTS idx_seat_reservations_session_id ON seat_reservations(session_id);
