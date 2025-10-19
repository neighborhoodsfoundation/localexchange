--
-- PostgreSQL database dump
--

\restrict Sd0CL0G5kxLDCGj3BrfBuyGbGSLzg3OnJrBjQsfxXKkiGtOOOuBq4ozMpal4V7H

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: account_type; Type: TYPE; Schema: public; Owner: localex_user
--

CREATE TYPE public.account_type AS ENUM (
    'MAIN',
    'ESCROW',
    'GIFT'
);


ALTER TYPE public.account_type OWNER TO localex_user;

--
-- Name: item_status; Type: TYPE; Schema: public; Owner: localex_user
--

CREATE TYPE public.item_status AS ENUM (
    'ACTIVE',
    'SOLD',
    'REMOVED',
    'DISPUTED'
);


ALTER TYPE public.item_status OWNER TO localex_user;

--
-- Name: ledger_entry_type; Type: TYPE; Schema: public; Owner: localex_user
--

CREATE TYPE public.ledger_entry_type AS ENUM (
    'CREDIT',
    'DEBIT'
);


ALTER TYPE public.ledger_entry_type OWNER TO localex_user;

--
-- Name: trade_status; Type: TYPE; Schema: public; Owner: localex_user
--

CREATE TYPE public.trade_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
    'DISPUTED'
);


ALTER TYPE public.trade_status OWNER TO localex_user;

--
-- Name: user_verification_status; Type: TYPE; Schema: public; Owner: localex_user
--

CREATE TYPE public.user_verification_status AS ENUM (
    'UNVERIFIED',
    'PENDING',
    'VERIFIED',
    'REJECTED'
);


ALTER TYPE public.user_verification_status OWNER TO localex_user;

--
-- Name: create_balanced_transaction(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: localex_user
--

CREATE FUNCTION public.create_balanced_transaction(transaction_uuid uuid, entries jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.create_balanced_transaction(transaction_uuid uuid, entries jsonb) OWNER TO localex_user;

--
-- Name: get_account_balance(uuid); Type: FUNCTION; Schema: public; Owner: localex_user
--

CREATE FUNCTION public.get_account_balance(account_uuid uuid) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.get_account_balance(account_uuid uuid) OWNER TO localex_user;

--
-- Name: transfer_credits(uuid, uuid, numeric, text, uuid); Type: FUNCTION; Schema: public; Owner: localex_user
--

CREATE FUNCTION public.transfer_credits(from_account_id uuid, to_account_id uuid, amount numeric, description text, transaction_uuid uuid DEFAULT gen_random_uuid()) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.transfer_credits(from_account_id uuid, to_account_id uuid, amount numeric, description text, transaction_uuid uuid) OWNER TO localex_user;

--
-- Name: validate_debit_balance(); Type: FUNCTION; Schema: public; Owner: localex_user
--

CREATE FUNCTION public.validate_debit_balance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.validate_debit_balance() OWNER TO localex_user;

--
-- Name: validate_transaction_consistency(); Type: FUNCTION; Schema: public; Owner: localex_user
--

CREATE FUNCTION public.validate_transaction_consistency() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.validate_transaction_consistency() OWNER TO localex_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: localex_user
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type public.account_type DEFAULT 'MAIN'::public.account_type NOT NULL,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.accounts OWNER TO localex_user;

--
-- Name: account_balances; Type: VIEW; Schema: public; Owner: localex_user
--

CREATE VIEW public.account_balances AS
 SELECT id AS account_id,
    user_id,
    type AS account_type,
    public.get_account_balance(id) AS balance,
    created_at,
    updated_at
   FROM public.accounts a;


ALTER VIEW public.account_balances OWNER TO localex_user;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: localex_user
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.audit_log OWNER TO localex_user;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: localex_user
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    parent_id uuid,
    image_url text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.categories OWNER TO localex_user;

--
-- Name: items; Type: TABLE; Schema: public; Owner: localex_user
--

CREATE TABLE public.items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    price_credits numeric(12,2) NOT NULL,
    condition character varying(50) NOT NULL,
    location_lat numeric(10,8),
    location_lng numeric(11,8),
    location_address text,
    status public.item_status DEFAULT 'ACTIVE'::public.item_status,
    is_featured boolean DEFAULT false,
    featured_until timestamp without time zone,
    view_count integer DEFAULT 0,
    cpsc_checked boolean DEFAULT false,
    cpsc_result jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT items_price_credits_check CHECK ((price_credits > (0)::numeric))
);


ALTER TABLE public.items OWNER TO localex_user;

--
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: localex_user
--

CREATE TABLE public.ledger_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    transaction_id uuid NOT NULL,
    type public.ledger_entry_type NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency character varying(10) DEFAULT 'CREDITS'::character varying,
    description text NOT NULL,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now(),
    idempotency_key character varying(255),
    CONSTRAINT ledger_entries_amount_check CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.ledger_entries OWNER TO localex_user;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: localex_user
--

CREATE TABLE public.migrations (
    id character varying(255) NOT NULL,
    filename character varying(255) NOT NULL,
    executed_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.migrations OWNER TO localex_user;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: localex_user
--

CREATE TABLE public.system_settings (
    key character varying(100) NOT NULL,
    value jsonb NOT NULL,
    description text,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.system_settings OWNER TO localex_user;

--
-- Name: trades; Type: TABLE; Schema: public; Owner: localex_user
--

CREATE TABLE public.trades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    buyer_id uuid NOT NULL,
    price_credits numeric(12,2) NOT NULL,
    status public.trade_status DEFAULT 'PENDING'::public.trade_status,
    message text,
    meetup_location_lat numeric(10,8),
    meetup_location_lng numeric(11,8),
    meetup_location_address text,
    meetup_scheduled_at timestamp without time zone,
    confirmed_at timestamp without time zone,
    completed_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    cancelled_reason text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT trades_price_credits_check CHECK ((price_credits > (0)::numeric))
);


ALTER TABLE public.trades OWNER TO localex_user;

--
-- Name: transaction_summaries; Type: VIEW; Schema: public; Owner: localex_user
--

CREATE VIEW public.transaction_summaries AS
 SELECT transaction_id,
    count(*) AS entry_count,
    sum(
        CASE
            WHEN (type = 'CREDIT'::public.ledger_entry_type) THEN amount
            ELSE (0)::numeric
        END) AS total_credits,
    sum(
        CASE
            WHEN (type = 'DEBIT'::public.ledger_entry_type) THEN amount
            ELSE (0)::numeric
        END) AS total_debits,
    min(created_at) AS transaction_date,
    string_agg(DISTINCT description, '; '::text) AS descriptions
   FROM public.ledger_entries
  GROUP BY transaction_id
  ORDER BY (min(created_at)) DESC;


ALTER VIEW public.transaction_summaries OWNER TO localex_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: localex_user
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20),
    date_of_birth date,
    verification_status public.user_verification_status DEFAULT 'UNVERIFIED'::public.user_verification_status,
    profile_image_url text,
    bio text,
    location_lat numeric(10,8),
    location_lng numeric(11,8),
    location_address text,
    timezone character varying(50) DEFAULT 'UTC'::character varying,
    language character varying(10) DEFAULT 'en'::character varying,
    is_active boolean DEFAULT true,
    is_banned boolean DEFAULT false,
    last_login_at timestamp without time zone,
    email_verified_at timestamp without time zone,
    phone_verified_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO localex_user;

--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_user_id_type_key; Type: CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_type_key UNIQUE (user_id, type);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: ledger_entries ledger_entries_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: trades trades_pkey; Type: CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_accounts_type; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_accounts_type ON public.accounts USING btree (type);


--
-- Name: idx_accounts_user_id; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_accounts_user_id ON public.accounts USING btree (user_id);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at);


--
-- Name: idx_audit_log_entity; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_audit_log_entity ON public.audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_audit_log_user_id; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_audit_log_user_id ON public.audit_log USING btree (user_id);


--
-- Name: idx_items_category_id; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_items_category_id ON public.items USING btree (category_id);


--
-- Name: idx_items_created_at; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_items_created_at ON public.items USING btree (created_at);


--
-- Name: idx_items_price; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_items_price ON public.items USING btree (price_credits);


--
-- Name: idx_items_status; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_items_status ON public.items USING btree (status);


--
-- Name: idx_items_user_id; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_items_user_id ON public.items USING btree (user_id);


--
-- Name: idx_ledger_entries_account_id; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_ledger_entries_account_id ON public.ledger_entries USING btree (account_id);


--
-- Name: idx_ledger_entries_created_at; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_ledger_entries_created_at ON public.ledger_entries USING btree (created_at);


--
-- Name: idx_ledger_entries_idempotency_key; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_ledger_entries_idempotency_key ON public.ledger_entries USING btree (idempotency_key);


--
-- Name: idx_ledger_entries_transaction_id; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_ledger_entries_transaction_id ON public.ledger_entries USING btree (transaction_id);


--
-- Name: idx_trades_buyer_id; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_trades_buyer_id ON public.trades USING btree (buyer_id);


--
-- Name: idx_trades_created_at; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_trades_created_at ON public.trades USING btree (created_at);


--
-- Name: idx_trades_item_id; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_trades_item_id ON public.trades USING btree (item_id);


--
-- Name: idx_trades_seller_id; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_trades_seller_id ON public.trades USING btree (seller_id);


--
-- Name: idx_trades_status; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_trades_status ON public.trades USING btree (status);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_verification_status; Type: INDEX; Schema: public; Owner: localex_user
--

CREATE INDEX idx_users_verification_status ON public.users USING btree (verification_status);


--
-- Name: ledger_entries trigger_validate_debit_balance; Type: TRIGGER; Schema: public; Owner: localex_user
--

CREATE TRIGGER trigger_validate_debit_balance BEFORE INSERT ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.validate_debit_balance();


--
-- Name: ledger_entries trigger_validate_transaction_consistency; Type: TRIGGER; Schema: public; Owner: localex_user
--

CREATE TRIGGER trigger_validate_transaction_consistency AFTER INSERT ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_consistency();


--
-- Name: accounts accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: items items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: items items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ledger_entries ledger_entries_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: trades trades_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: trades trades_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: trades trades_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: localex_user
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO localex_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO localex_user;


--
-- PostgreSQL database dump complete
--

\unrestrict Sd0CL0G5kxLDCGj3BrfBuyGbGSLzg3OnJrBjQsfxXKkiGtOOOuBq4ozMpal4V7H

