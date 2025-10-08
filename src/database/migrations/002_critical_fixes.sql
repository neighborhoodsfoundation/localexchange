-- LocalEx Database Schema - Critical Fixes
-- Implements v5 architecture critical fixes for production readiness

-- =====================================================
-- CRITICAL FIX 1: BEFORE INSERT TRIGGER FOR BALANCE CHECKS
-- =====================================================

-- Function to check balance before inserting ledger entry (CRITICAL FIX)
CREATE OR REPLACE FUNCTION check_balance_before_insert()
RETURNS TRIGGER AS $$
DECLARE
    current_balance DECIMAL(12,2);
BEGIN
    -- Calculate current balance from ledger entries
    SELECT COALESCE(SUM(
        CASE 
            WHEN type = 'CREDIT' THEN amount 
            WHEN type = 'DEBIT' THEN -amount 
        END
    ), 0)
    INTO current_balance
    FROM ledger_entries 
    WHERE account_id = NEW.account_id;
    
    -- Check if new debit entry would make balance negative
    IF NEW.type = 'DEBIT' AND (current_balance - NEW.amount) < 0 THEN
        RAISE EXCEPTION 'Insufficient balance: current=%, requested=%', current_balance, NEW.amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create BEFORE INSERT trigger (CRITICAL FIX)
DROP TRIGGER IF EXISTS balance_check_trigger ON ledger_entries;
CREATE TRIGGER balance_check_before_trigger
    BEFORE INSERT ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION check_balance_before_insert();

-- =====================================================
-- CRITICAL FIX 2: IMMUTABLE LEDGER WITH AUDIT TRAIL
-- =====================================================

-- Function to prevent ledger entry updates (immutability)
CREATE OR REPLACE FUNCTION prevent_ledger_entry_updates()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Ledger entries are immutable - cannot update existing entries';
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Ledger entries are immutable - cannot delete existing entries';
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent updates/deletes
CREATE TRIGGER prevent_ledger_entry_changes
    AFTER UPDATE OR DELETE ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_entry_updates();

-- =====================================================
-- CRITICAL FIX 3: AUTOMATIC ACCOUNT CREATION
-- =====================================================

-- Function to automatically create MAIN account for new users
CREATE OR REPLACE FUNCTION create_main_account_for_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create MAIN account for new user
    INSERT INTO accounts (user_id, type)
    VALUES (NEW.id, 'MAIN')
    ON CONFLICT (user_id, type) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create account
CREATE TRIGGER create_main_account_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_main_account_for_user();

-- =====================================================
-- CRITICAL FIX 4: BALANCE VIEW FOR PERFORMANCE
-- =====================================================

-- Create materialized view for account balances (performance optimization)
CREATE MATERIALIZED VIEW account_balances AS
SELECT 
    a.id as account_id,
    a.user_id,
    a.type as account_type,
    COALESCE(SUM(
        CASE 
            WHEN le.type = 'CREDIT' THEN le.amount 
            WHEN le.type = 'DEBIT' THEN -le.amount 
        END
    ), 0) as balance,
    COUNT(le.id) as transaction_count,
    MAX(le.created_at) as last_transaction_at
FROM accounts a
LEFT JOIN ledger_entries le ON a.id = le.account_id
GROUP BY a.id, a.user_id, a.type;

-- Create unique index on the materialized view
CREATE UNIQUE INDEX idx_account_balances_account_id ON account_balances(account_id);

-- Create index for user balance queries
CREATE INDEX idx_account_balances_user_id ON account_balances(user_id);

-- Function to refresh account balances
CREATE OR REPLACE FUNCTION refresh_account_balances()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY account_balances;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CRITICAL FIX 5: IDEMPOTENCY CONSTRAINT
-- =====================================================

-- Ensure idempotency keys are unique and not null for transactions
ALTER TABLE ledger_entries 
ALTER COLUMN idempotency_key SET NOT NULL;

-- Create unique index for idempotency (already exists but ensure it's enforced)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_entries_idempotency_unique 
ON ledger_entries(idempotency_key);

-- =====================================================
-- CRITICAL FIX 6: TRANSACTION INTEGRITY
-- =====================================================

-- Function to ensure debit/credit pairs for transactions
CREATE OR REPLACE FUNCTION validate_transaction_balance()
RETURNS TRIGGER AS $$
DECLARE
    transaction_sum DECIMAL(12,2);
BEGIN
    -- Calculate sum of all entries for this transaction
    SELECT COALESCE(SUM(
        CASE 
            WHEN type = 'CREDIT' THEN amount 
            WHEN type = 'DEBIT' THEN -amount 
        END
    ), 0)
    INTO transaction_sum
    FROM ledger_entries 
    WHERE transaction_id = NEW.transaction_id;
    
    -- Transaction must balance to zero (double-entry accounting)
    IF ABS(transaction_sum) > 0.01 THEN -- Allow for small rounding errors
        RAISE EXCEPTION 'Transaction % does not balance: sum=%. Double-entry accounting requires balanced transactions.', 
            NEW.transaction_id, transaction_sum;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate transaction balance
CREATE TRIGGER validate_transaction_balance_trigger
    AFTER INSERT ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION validate_transaction_balance();

-- =====================================================
-- CRITICAL FIX 7: CPSC INTEGRATION CONSTRAINTS
-- =====================================================

-- Add constraint to ensure CPSC check before item activation
ALTER TABLE items 
ADD CONSTRAINT items_cpsc_check_required 
CHECK (
    (status = 'ACTIVE' AND cpsc_checked = true) OR 
    status != 'ACTIVE'
);

-- =====================================================
-- CRITICAL FIX 8: TRADE INTEGRITY CONSTRAINTS
-- =====================================================

-- Ensure trades can only be created for active items
CREATE OR REPLACE FUNCTION validate_trade_item_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if item is active
    IF NOT EXISTS (
        SELECT 1 FROM items 
        WHERE id = NEW.item_id 
        AND status = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'Cannot create trade for inactive item: %', NEW.item_id;
    END IF;
    
    -- Check if item belongs to seller
    IF NOT EXISTS (
        SELECT 1 FROM items 
        WHERE id = NEW.item_id 
        AND user_id = NEW.seller_id
    ) THEN
        RAISE EXCEPTION 'Seller % does not own item %', NEW.seller_id, NEW.item_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate trade creation
CREATE TRIGGER validate_trade_creation_trigger
    BEFORE INSERT ON trades
    FOR EACH ROW
    EXECUTE FUNCTION validate_trade_item_status();

-- =====================================================
-- CRITICAL FIX 9: AUDIT LOGGING
-- =====================================================

-- Function to log all ledger entry changes
CREATE OR REPLACE FUNCTION log_ledger_entry_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (action, entity_type, entity_id, new_values)
        VALUES ('INSERT', 'ledger_entry', NEW.id, row_to_json(NEW));
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ledger entry audit logging
CREATE TRIGGER log_ledger_entry_changes_trigger
    AFTER INSERT ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION log_ledger_entry_changes();

-- =====================================================
-- CRITICAL FIX 10: PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- Create partial indexes for active items only
CREATE INDEX idx_items_active_location ON items USING GIST (POINT(location_lng, location_lat))
WHERE status = 'ACTIVE';

CREATE INDEX idx_items_active_price ON items(price_credits)
WHERE status = 'ACTIVE';

CREATE INDEX idx_items_active_category ON items(category_id)
WHERE status = 'ACTIVE';

-- Create index for recent trades
CREATE INDEX idx_trades_recent ON trades(created_at DESC)
WHERE created_at > NOW() - INTERVAL '30 days';

-- Create index for pending trades
CREATE INDEX idx_trades_pending ON trades(status, created_at)
WHERE status = 'PENDING';

-- =====================================================
-- CRITICAL FIX 11: DATA RETENTION CONSTRAINTS
-- =====================================================

-- Add created_at constraints for data retention
ALTER TABLE users 
ADD CONSTRAINT users_created_at_recent 
CHECK (created_at >= '2020-01-01'::timestamp);

ALTER TABLE ledger_entries 
ADD CONSTRAINT ledger_entries_created_at_recent 
CHECK (created_at >= '2020-01-01'::timestamp);

-- =====================================================
-- CRITICAL FIX 12: SECURITY CONSTRAINTS
-- =====================================================

-- Ensure passwords are hashed (minimum length check)
ALTER TABLE users 
ADD CONSTRAINT users_password_length 
CHECK (length(password_hash) >= 60);

-- Ensure email is lowercase
CREATE OR REPLACE FUNCTION normalize_user_email()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email = LOWER(NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to normalize email
CREATE TRIGGER normalize_user_email_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION normalize_user_email();

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Insert default categories
INSERT INTO categories (name, description, sort_order) VALUES
('Electronics', 'Electronic devices and accessories', 1),
('Clothing', 'Apparel and fashion items', 2),
('Home & Garden', 'Home improvement and garden supplies', 3),
('Sports & Outdoors', 'Sports equipment and outdoor gear', 4),
('Books & Media', 'Books, movies, and media', 5),
('Toys & Games', 'Toys and gaming items', 6),
('Automotive', 'Car parts and automotive accessories', 7),
('Health & Beauty', 'Health and beauty products', 8),
('Other', 'Miscellaneous items', 99)
ON CONFLICT (name) DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
('credit_conversion_rate', '{"BTC_PER_CREDIT": 0.000001, "MIN_CONVERSION": 1000, "MAX_CONVERSION": 100000}', 'Credit to BTC conversion rates'),
('cpsc_api_enabled', '{"enabled": true, "cache_ttl": 86400}', 'CPSC API configuration'),
('search_weights', '{"proximity": 0.25, "recency": 0.20, "photo_count": 0.15, "reputation": 0.20, "category_match": 0.10, "freshness": 0.10}', 'Search scoring weights'),
('rate_limits', '{"api_calls_per_hour": 1000, "search_requests_per_minute": 60, "upload_requests_per_hour": 100}', 'Rate limiting configuration')
ON CONFLICT (key) DO NOTHING;

-- Refresh the materialized view
SELECT refresh_account_balances();
