-- Migration: Create wallet_transactions table for wallet/rewards system
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL, -- e.g. 'topup', 'redeem', 'payment', etc.
    amount NUMERIC(12,2) NOT NULL,
    method VARCHAR(32) NOT NULL, -- e.g. 'card', 'fpx', 'tng', 'easipoints'
    status VARCHAR(32) NOT NULL DEFAULT 'success',
    reference VARCHAR(128), -- Stripe paymentIntent ID, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);
