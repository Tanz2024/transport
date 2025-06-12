-- Add created_at column to users table if it does not exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Optionally, backfill created_at for existing users (set to now if null)
UPDATE users SET created_at = NOW() WHERE created_at IS NULL;
