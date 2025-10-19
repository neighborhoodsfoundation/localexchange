-- LocalEx Database Triggers for Balance Validation
-- Implements critical balance checks for double-entry ledger system

-- =====================================================
-- BALANCE VALIDATION FUNCTIONS
-- =====================================================

-- Function to calculate current account balance
CREATE OR REPLACE FUNCTION get_account_balance(account_uuid UUID)
RETURNS DECIMAL(12,2) AS $$
DECLARE
    balance DECIMAL(12,2) := 0;
BEGIN
    SELECT COALESCE(
        (SELECT SUM(amount) FROM ledger_entries 
         WHERE account_id = account_uuid AND type = 'CREDIT'), 0
    ) - COALESCE(
        (SELECT SUM(amount) FROM ledger_entries 
         WHERE account_id = account_uuid AND type = 'DEBIT'), 0
    ) INTO balance;
    
    RETURN balance;
END;
$$ LANGUAGE plpgsql;

-- Function to validate balance before debit
CREATE OR REPLACE FUNCTION validate_debit_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_balance DECIMAL(12,2);
    new_balance DECIMAL(12,2);
BEGIN
    -- Only check for DEBIT entries
    IF NEW.type != 'DEBIT' THEN
        RETURN NEW;
    END IF;
    
    -- Get current balance
    current_balance := get_account_balance(NEW.account_id);
    
    -- Calculate new balance after this debit
    new_balance := current_balance - NEW.amount;
    
    -- Prevent negative balance
    IF new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Attempted debit: %, Would result in: %', 
            current_balance, NEW.amount, new_balance;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate transaction consistency (double-entry)
CREATE OR REPLACE FUNCTION validate_transaction_consistency()
RETURNS TRIGGER AS $$
DECLARE
    transaction_credits DECIMAL(12,2);
    transaction_debits DECIMAL(12,2);
BEGIN
    -- Calculate total credits and debits for this transaction
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END), 0)
    INTO transaction_credits, transaction_debits
    FROM ledger_entries 
    WHERE transaction_id = NEW.transaction_id;
    
    -- Check if transaction is balanced (credits = debits)
    IF transaction_credits != transaction_debits THEN
        RAISE EXCEPTION 'Transaction not balanced. Credits: %, Debits: %', 
            transaction_credits, transaction_debits;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to validate debit balance before insert
CREATE TRIGGER trigger_validate_debit_balance
    BEFORE INSERT ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION validate_debit_balance();

-- Trigger to validate transaction consistency after insert
CREATE TRIGGER trigger_validate_transaction_consistency
    AFTER INSERT ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION validate_transaction_consistency();

-- =====================================================
-- HELPER FUNCTIONS FOR APPLICATION USE
-- =====================================================

-- Function to create a balanced transaction
CREATE OR REPLACE FUNCTION create_balanced_transaction(
    transaction_uuid UUID,
    entries JSONB
) RETURNS VOID AS $$
DECLARE
    entry JSONB;
    total_credits DECIMAL(12,2) := 0;
    total_debits DECIMAL(12,2) := 0;
BEGIN
    -- Validate entries structure and calculate totals
    FOR entry IN SELECT * FROM jsonb_array_elements(entries)
    LOOP
        IF entry->>'type' = 'CREDIT' THEN
            total_credits := total_credits + (entry->>'amount')::DECIMAL(12,2);
        ELSIF entry->>'type' = 'DEBIT' THEN
            total_debits := total_debits + (entry->>'amount')::DECIMAL(12,2);
        ELSE
            RAISE EXCEPTION 'Invalid entry type: %', entry->>'type';
        END IF;
    END LOOP;
    
    -- Check if transaction is balanced
    IF total_credits != total_debits THEN
        RAISE EXCEPTION 'Transaction not balanced. Credits: %, Debits: %', 
            total_credits, total_debits;
    END IF;
    
    -- Insert all entries
    FOR entry IN SELECT * FROM jsonb_array_elements(entries)
    LOOP
        INSERT INTO ledger_entries (
            transaction_id,
            account_id,
            type,
            amount,
            currency,
            description,
            metadata,
            idempotency_key
        ) VALUES (
            transaction_uuid,
            (entry->>'account_id')::UUID,
            (entry->>'type')::ledger_entry_type,
            (entry->>'amount')::DECIMAL(12,2),
            COALESCE(entry->>'currency', 'CREDITS'),
            entry->>'description',
            entry->'metadata',
            entry->>'idempotency_key'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to transfer credits between accounts
CREATE OR REPLACE FUNCTION transfer_credits(
    from_account_id UUID,
    to_account_id UUID,
    amount DECIMAL(12,2),
    description TEXT,
    transaction_uuid UUID DEFAULT gen_random_uuid()
) RETURNS UUID AS $$
DECLARE
    current_balance DECIMAL(12,2);
BEGIN
    -- Check sender balance
    current_balance := get_account_balance(from_account_id);
    
    IF current_balance < amount THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Requested: %', 
            current_balance, amount;
    END IF;
    
    -- Create balanced transaction
    PERFORM create_balanced_transaction(
        transaction_uuid,
        jsonb_build_array(
            jsonb_build_object(
                'account_id', from_account_id,
                'type', 'DEBIT',
                'amount', amount,
                'description', description || ' (outgoing)',
                'idempotency_key', transaction_uuid || '_debit'
            ),
            jsonb_build_object(
                'account_id', to_account_id,
                'type', 'CREDIT',
                'amount', amount,
                'description', description || ' (incoming)',
                'idempotency_key', transaction_uuid || '_credit'
            )
        )
    );
    
    RETURN transaction_uuid;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR BALANCE REPORTING
-- =====================================================

-- View for account balances
CREATE OR REPLACE VIEW account_balances AS
SELECT 
    a.id as account_id,
    a.user_id,
    a.type as account_type,
    get_account_balance(a.id) as balance,
    a.created_at,
    a.updated_at
FROM accounts a;

-- View for transaction summaries
CREATE OR REPLACE VIEW transaction_summaries AS
SELECT 
    transaction_id,
    COUNT(*) as entry_count,
    SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as total_credits,
    SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as total_debits,
    MIN(created_at) as transaction_date,
    STRING_AGG(DISTINCT description, '; ') as descriptions
FROM ledger_entries
GROUP BY transaction_id
ORDER BY transaction_date DESC;
