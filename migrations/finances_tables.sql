-- Finance Module Database Tables
-- Run this migration in your Supabase dashboard to create all finance-related tables

-- Enable RLS on all tables by default
-- Tables: bank_accounts, account_balances, financial_transactions, gocardless_connections, financial_summaries

-- 1. Bank Accounts Table
CREATE TABLE bank_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Account Details
    name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('checking', 'savings', 'credit', 'investment', 'loan', 'other')),
    account_number_last4 VARCHAR(4), -- Only store last 4 digits for security
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    
    -- Connection Details
    connection_type VARCHAR(20) NOT NULL CHECK (connection_type IN ('gocardless', 'manual')) DEFAULT 'manual',
    gocardless_account_id VARCHAR(255) UNIQUE, -- GoCardless account ID
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Manual Account Fields
    current_balance DECIMAL(15,2), -- For manual accounts
    
    -- Metadata
    description TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Account Balances Table (Time Series)
CREATE TABLE account_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE NOT NULL,
    
    -- Balance Data
    balance DECIMAL(15,2) NOT NULL,
    available_balance DECIMAL(15,2), -- Available balance (may differ from balance for credit accounts)
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    
    -- Metadata
    balance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source VARCHAR(20) NOT NULL CHECK (source IN ('gocardless', 'manual')) DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate balance entries per day
    UNIQUE(bank_account_id, balance_date)
);

-- 3. Financial Transactions Table
CREATE TABLE financial_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE NOT NULL,
    
    -- Transaction Details
    transaction_id VARCHAR(255), -- External transaction ID from bank
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    transaction_date DATE NOT NULL,
    posting_date DATE,
    
    -- Transaction Info
    description TEXT,
    merchant_name VARCHAR(255),
    category VARCHAR(100),
    transaction_type VARCHAR(50) CHECK (transaction_type IN ('debit', 'credit', 'transfer', 'fee', 'interest', 'other')),
    
    -- GoCardless specific fields
    gocardless_transaction_id VARCHAR(255) UNIQUE,
    reference VARCHAR(255),
    
    -- Metadata
    source VARCHAR(20) NOT NULL CHECK (source IN ('gocardless', 'manual')) DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. GoCardless Connections Table
CREATE TABLE gocardless_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- GoCardless Details
    requisition_id VARCHAR(255) UNIQUE NOT NULL,
    institution_id VARCHAR(255) NOT NULL,
    institution_name VARCHAR(255) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    
    -- Connection Status
    status VARCHAR(50) NOT NULL CHECK (status IN ('created', 'linked', 'expired', 'suspended', 'error')) DEFAULT 'created',
    access_valid_for_days INTEGER DEFAULT 90,
    max_historical_days INTEGER DEFAULT 90,
    
    -- Agreement Details
    end_user_agreement_id VARCHAR(255),
    agreement_accepted_at TIMESTAMP WITH TIME ZONE,
    agreement_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_error TEXT
);

-- 5. Financial Summaries Table (Cached aggregations)
CREATE TABLE financial_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Summary Data
    total_bank_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_investment_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_real_estate_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_asset_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_net_worth DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Currency and Date
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    summary_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for one summary per user per day
    UNIQUE(user_id, summary_date)
);

-- Create indexes for better performance
CREATE INDEX idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX idx_bank_accounts_gocardless_id ON bank_accounts(gocardless_account_id);
CREATE INDEX idx_account_balances_account_date ON account_balances(bank_account_id, balance_date DESC);
CREATE INDEX idx_financial_transactions_account_date ON financial_transactions(bank_account_id, transaction_date DESC);
CREATE INDEX idx_gocardless_connections_user_id ON gocardless_connections(user_id);
CREATE INDEX idx_gocardless_connections_requisition ON gocardless_connections(requisition_id);
CREATE INDEX idx_financial_summaries_user_date ON financial_summaries(user_id, summary_date DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gocardless_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Bank Accounts Policies
CREATE POLICY "Users can view their own bank accounts" ON bank_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts" ON bank_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts" ON bank_accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts" ON bank_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Account Balances Policies
CREATE POLICY "Users can view their own account balances" ON account_balances
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own account balances" ON account_balances
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own account balances" ON account_balances
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own account balances" ON account_balances
    FOR DELETE USING (auth.uid() = user_id);

-- Financial Transactions Policies
CREATE POLICY "Users can view their own financial transactions" ON financial_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial transactions" ON financial_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial transactions" ON financial_transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial transactions" ON financial_transactions
    FOR DELETE USING (auth.uid() = user_id);

-- GoCardless Connections Policies
CREATE POLICY "Users can view their own gocardless connections" ON gocardless_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gocardless connections" ON gocardless_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gocardless connections" ON gocardless_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gocardless connections" ON gocardless_connections
    FOR DELETE USING (auth.uid() = user_id);

-- Financial Summaries Policies
CREATE POLICY "Users can view their own financial summaries" ON financial_summaries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial summaries" ON financial_summaries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial summaries" ON financial_summaries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial summaries" ON financial_summaries
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_transactions_updated_at BEFORE UPDATE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gocardless_connections_updated_at BEFORE UPDATE ON gocardless_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_summaries_updated_at BEFORE UPDATE ON financial_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to automatically calculate financial summaries
CREATE OR REPLACE FUNCTION calculate_financial_summary(target_user_id UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS financial_summaries AS $$
DECLARE
    summary_record financial_summaries;
    bank_total DECIMAL(15,2);
    investment_total DECIMAL(15,2);
    real_estate_total DECIMAL(15,2);
    asset_total DECIMAL(15,2);
BEGIN
    -- Calculate total bank balance from latest balances
    SELECT COALESCE(SUM(ab.balance), 0) INTO bank_total
    FROM account_balances ab
    INNER JOIN bank_accounts ba ON ab.bank_account_id = ba.id
    WHERE ba.user_id = target_user_id
    AND ba.is_active = true
    AND ab.balance_date = (
        SELECT MAX(balance_date) 
        FROM account_balances ab2 
        WHERE ab2.bank_account_id = ab.bank_account_id 
        AND ab2.balance_date <= target_date
    );

    -- Calculate total investment value
    SELECT COALESCE(SUM(COALESCE(i.initial_investment_amount, 0)), 0) INTO investment_total
    FROM investments i
    WHERE i.user_id = target_user_id;

    -- Calculate total real estate value
    SELECT COALESCE(SUM(COALESCE(p.current_market_value, p.acquisition_price, 0)), 0) INTO real_estate_total
    FROM properties p
    WHERE p.user_id = target_user_id;

    -- For now, set asset total to 0 (can be expanded later)
    asset_total := 0;

    -- Insert or update the summary
    INSERT INTO financial_summaries (
        user_id, total_bank_balance, total_investment_value, 
        total_real_estate_value, total_asset_value, total_net_worth, summary_date
    )
    VALUES (
        target_user_id, bank_total, investment_total, 
        real_estate_total, asset_total, bank_total + investment_total + real_estate_total + asset_total, target_date
    )
    ON CONFLICT (user_id, summary_date)
    DO UPDATE SET
        total_bank_balance = EXCLUDED.total_bank_balance,
        total_investment_value = EXCLUDED.total_investment_value,
        total_real_estate_value = EXCLUDED.total_real_estate_value,
        total_asset_value = EXCLUDED.total_asset_value,
        total_net_worth = EXCLUDED.total_net_worth,
        updated_at = NOW()
    RETURNING * INTO summary_record;

    RETURN summary_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;