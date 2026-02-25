-- Sample database initialization for AI Analyst Platform
-- This creates demo tables for testing

-- Customer activity table
CREATE TABLE IF NOT EXISTS customer_activity (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_date TIMESTAMP NOT NULL,
    value DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    transaction_date TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    age INTEGER,
    country VARCHAR(50),
    account_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Investment holdings table
CREATE TABLE IF NOT EXISTS investment_holdings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    symbol VARCHAR(10),
    quantity DECIMAL(18, 8),
    purchase_price DECIMAL(10, 2),
    current_value DECIMAL(10, 2),
    purchase_date TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    ticket_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'open',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Insert sample data
INSERT INTO user_profiles (user_id, email, age, country, account_type) VALUES
    ('user_001', 'alice@example.com', 28, 'Canada', 'premium'),
    ('user_002', 'bob@example.com', 35, 'USA', 'standard'),
    ('user_003', 'charlie@example.com', 42, 'Canada', 'premium');

INSERT INTO transactions (user_id, transaction_type, amount, transaction_date) VALUES
    ('user_001', 'deposit', 1000.00, NOW() - INTERVAL '30 days'),
    ('user_001', 'withdrawal', 200.00, NOW() - INTERVAL '15 days'),
    ('user_002', 'deposit', 5000.00, NOW() - INTERVAL '60 days'),
    ('user_003', 'deposit', 2500.00, NOW() - INTERVAL '45 days');

INSERT INTO customer_activity (user_id, activity_type, activity_date, value) VALUES
    ('user_001', 'login', NOW() - INTERVAL '1 day', NULL),
    ('user_001', 'trade', NOW() - INTERVAL '2 days', 500.00),
    ('user_002', 'login', NOW() - INTERVAL '5 days', NULL),
    ('user_003', 'trade', NOW() - INTERVAL '3 days', 1000.00);

-- Create indexes for better query performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_customer_activity_user_id ON customer_activity(user_id);
CREATE INDEX idx_customer_activity_date ON customer_activity(activity_date);
CREATE INDEX idx_investment_holdings_user_id ON investment_holdings(user_id);
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);

-- Grant read-only access (for production safety)
-- In production, you would create a separate read-only user
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analyst;

-- Made with Bob
