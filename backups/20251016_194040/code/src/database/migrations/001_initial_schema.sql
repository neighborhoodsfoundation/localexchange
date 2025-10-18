-- LocalEx Database Schema - Initial Setup
-- Implements v5 architecture with double-entry ledger and critical fixes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for secure random generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE account_type AS ENUM ('MAIN', 'ESCROW', 'GIFT');
CREATE TYPE ledger_entry_type AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE trade_status AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DISPUTED');
CREATE TYPE user_verification_status AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE item_status AS ENUM ('ACTIVE', 'SOLD', 'REMOVED', 'DISPUTED');

-- =====================================================
-- CORE USER MANAGEMENT TABLES
-- =====================================================

-- Users table - Core user information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    verification_status user_verification_status DEFAULT 'UNVERIFIED',
    profile_image_url TEXT,
    bio TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_address TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    is_active BOOLEAN DEFAULT true,
    is_banned BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    email_verified_at TIMESTAMP,
    phone_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_phone_format CHECK (phone ~* '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT users_age_check CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '13 years')
);

-- User verification documents
CREATE TABLE user_verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'DRIVERS_LICENSE', 'PASSPORT', 'STATE_ID'
    document_number VARCHAR(100),
    document_image_url TEXT,
    verification_data JSONB,
    status user_verification_status DEFAULT 'PENDING',
    verified_at TIMESTAMP,
    verified_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- FINANCIAL SYSTEM - DOUBLE-ENTRY LEDGER
-- =====================================================

-- Accounts table - User financial accounts (NO stored balance)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type account_type NOT NULL DEFAULT 'MAIN',
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure one account per type per user
    UNIQUE(user_id, type)
);

-- Ledger entries - Immutable double-entry accounting (CRITICAL FIX)
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL,
    type ledger_entry_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'CREDITS',
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    idempotency_key VARCHAR(255) UNIQUE,
    
    -- Constraints
    CONSTRAINT ledger_entries_type_check CHECK (type IN ('CREDIT', 'DEBIT')),
    CONSTRAINT ledger_entries_amount_positive CHECK (amount > 0)
);

-- =====================================================
-- ITEM MANAGEMENT TABLES
-- =====================================================

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Items table - User listings
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    price_credits DECIMAL(12,2) NOT NULL CHECK (price_credits > 0),
    condition VARCHAR(50) NOT NULL, -- 'NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_address TEXT,
    status item_status DEFAULT 'ACTIVE',
    is_featured BOOLEAN DEFAULT false,
    featured_until TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    cpsc_checked BOOLEAN DEFAULT false,
    cpsc_result JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT items_condition_check CHECK (condition IN ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR')),
    CONSTRAINT items_price_positive CHECK (price_credits > 0)
);

-- Item images
CREATE TABLE item_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    alt_text VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure only one primary image per item
    UNIQUE(item_id, is_primary) DEFERRABLE INITIALLY DEFERRED
);

-- =====================================================
-- TRADING SYSTEM TABLES
-- =====================================================

-- Trades table - Trading transactions
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    price_credits DECIMAL(12,2) NOT NULL CHECK (price_credits > 0),
    status trade_status DEFAULT 'PENDING',
    message TEXT,
    meetup_location_lat DECIMAL(10, 8),
    meetup_location_lng DECIMAL(11, 8),
    meetup_location_address TEXT,
    meetup_scheduled_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancelled_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT trades_price_positive CHECK (price_credits > 0),
    CONSTRAINT trades_different_users CHECK (seller_id != buyer_id)
);

-- Trade messages - Communication between buyer and seller
CREATE TABLE trade_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_system_message BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Note: Trade message sender validation will be handled at application level
    -- CONSTRAINT trade_messages_sender_in_trade CHECK (
    --     sender_id IN (
    --         SELECT seller_id FROM trades WHERE id = trade_id
    --         UNION
    --         SELECT buyer_id FROM trades WHERE id = trade_id
    --     )
    -- )
);

-- =====================================================
-- SYSTEM TABLES
-- =====================================================

-- System settings
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Audit log - Track all important changes
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_status ON users(verification_status);
CREATE INDEX idx_users_location ON users USING GIST (POINT(location_lng, location_lat));
CREATE INDEX idx_users_created_at ON users(created_at);

-- Accounts indexes
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_type ON accounts(type);

-- Ledger entries indexes (CRITICAL for financial queries)
CREATE INDEX idx_ledger_entries_account_id ON ledger_entries(account_id);
CREATE INDEX idx_ledger_entries_transaction_id ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_entries_created_at ON ledger_entries(created_at);
CREATE INDEX idx_ledger_entries_idempotency_key ON ledger_entries(idempotency_key);
CREATE INDEX idx_ledger_entries_account_created ON ledger_entries(account_id, created_at);

-- Items indexes
CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_category_id ON items(category_id);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_price ON items(price_credits);
CREATE INDEX idx_items_location ON items USING GIST (POINT(location_lng, location_lat));
CREATE INDEX idx_items_created_at ON items(created_at);
CREATE INDEX idx_items_featured ON items(is_featured, featured_until);

-- Item images indexes
CREATE INDEX idx_item_images_item_id ON item_images(item_id);
CREATE INDEX idx_item_images_primary ON item_images(item_id, is_primary);

-- Trades indexes
CREATE INDEX idx_trades_item_id ON trades(item_id);
CREATE INDEX idx_trades_seller_id ON trades(seller_id);
CREATE INDEX idx_trades_buyer_id ON trades(buyer_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_created_at ON trades(created_at);

-- Trade messages indexes
CREATE INDEX idx_trade_messages_trade_id ON trade_messages(trade_id);
CREATE INDEX idx_trade_messages_created_at ON trade_messages(created_at);

-- Audit log indexes
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
