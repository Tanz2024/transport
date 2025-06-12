-- Migration: Add first_name, middle_name, last_name to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(64);

-- Optionally, migrate existing data from name to first_name/last_name
-- UPDATE users SET first_name = split_part(name, ' ', 1), last_name = split_part(name, ' ', 2) WHERE first_name IS NULL AND last_name IS NULL;
