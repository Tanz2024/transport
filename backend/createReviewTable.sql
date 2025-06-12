-- Create reviews table for storing user reviews (testimonials)
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    location VARCHAR(120),
    review_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Index for faster retrieval
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
