-- ZAKAT CALCULATION FEATURE
-- This migration adds tables for Zakat calculation without modifying existing tables

-- 1. Gold and Silver Prices Cache (Daily)
CREATE TABLE IF NOT EXISTS gold_silver_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    gold_price_per_gram_usd DECIMAL(10,2) NOT NULL,
    silver_price_per_gram_usd DECIMAL(10,2) NOT NULL,
    exchange_rate_usd_to_inr DECIMAL(10,4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Zakat Settings (User-specific)
CREATE TABLE IF NOT EXISTS zakat_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    anniversary_date DATE NOT NULL, -- Gregorian date for Zakat year start
    nisab_type TEXT NOT NULL DEFAULT 'silver' CHECK (nisab_type IN ('silver', 'gold')),
    school_of_thought TEXT NOT NULL DEFAULT 'hanafi' CHECK (school_of_thought IN ('hanafi', 'shafi', 'maliki', 'hanbali')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Zakat Snapshots (Annual, Read-only)
CREATE TABLE IF NOT EXISTS zakat_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL, -- The date on which snapshot was taken
    zakat_year_start DATE NOT NULL,
    zakat_year_end DATE NOT NULL,
    
    -- Calculated values (stored for historical accuracy)
    total_zakatable_assets DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_deductible_liabilities DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_zakatable_wealth DECIMAL(12,2) NOT NULL DEFAULT 0,
    nisab_threshold DECIMAL(12,2) NOT NULL,
    nisab_type TEXT NOT NULL CHECK (nisab_type IN ('silver', 'gold')),
    zakat_due DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE (profile_id, snapshot_date)
);

-- 4. Zakat Asset Items (Individual assets in a snapshot)
CREATE TABLE IF NOT EXISTS zakat_asset_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES zakat_snapshots(id) ON DELETE CASCADE,
    
    -- Asset identification
    asset_type TEXT NOT NULL CHECK (asset_type IN (
        'cash', 'bank_balance', 'savings', 'emergency_fund',
        'investment', 'gold', 'silver', 'receivable', 'other'
    )),
    asset_name TEXT NOT NULL,
    
    -- Source reference (optional, for linking to existing data)
    source_type TEXT, -- 'income', 'goal', 'investment_plan', 'loan', 'manual'
    source_id UUID, -- ID of the source record if applicable
    
    -- Values at snapshot time
    market_value DECIMAL(12,2) NOT NULL,
    
    -- User control
    is_included BOOLEAN NOT NULL DEFAULT true, -- User can exclude from calculation
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Zakat Liability Items (Individual liabilities in a snapshot)
CREATE TABLE IF NOT EXISTS zakat_liability_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES zakat_snapshots(id) ON DELETE CASCADE,
    
    -- Liability identification
    liability_type TEXT NOT NULL CHECK (liability_type IN (
        'emi', 'credit_card', 'short_term_debt', 'unpaid_bill', 'other'
    )),
    liability_name TEXT NOT NULL,
    
    -- Source reference (optional)
    source_type TEXT, -- 'loan', 'expense', 'manual'
    source_id UUID,
    
    -- Values at snapshot time (only next 12 months)
    amount_due_next_12_months DECIMAL(12,2) NOT NULL,
    
    -- User control
    is_included BOOLEAN NOT NULL DEFAULT true,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE gold_silver_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE zakat_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE zakat_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE zakat_asset_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE zakat_liability_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Gold/Silver Prices: Read-only for authenticated users
CREATE POLICY "Authenticated can read prices" ON gold_silver_prices
    FOR SELECT USING (auth.role() = 'authenticated');

-- Zakat Settings: Users can manage their own settings
CREATE POLICY "Users can manage own zakat settings" ON zakat_settings
    FOR ALL USING (profile_id = auth.uid());

-- Zakat Snapshots: Users can view their own snapshots
CREATE POLICY "Users can view own snapshots" ON zakat_snapshots
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can create own snapshots" ON zakat_snapshots
    FOR INSERT WITH CHECK (profile_id = auth.uid());

-- Zakat Asset Items: Inherit from snapshot
CREATE POLICY "Users can view own asset items" ON zakat_asset_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM zakat_snapshots
            WHERE zakat_snapshots.id = zakat_asset_items.snapshot_id
            AND zakat_snapshots.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own asset items" ON zakat_asset_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM zakat_snapshots
            WHERE zakat_snapshots.id = zakat_asset_items.snapshot_id
            AND zakat_snapshots.profile_id = auth.uid()
        )
    );

-- Zakat Liability Items: Inherit from snapshot
CREATE POLICY "Users can view own liability items" ON zakat_liability_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM zakat_snapshots
            WHERE zakat_snapshots.id = zakat_liability_items.snapshot_id
            AND zakat_snapshots.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own liability items" ON zakat_liability_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM zakat_snapshots
            WHERE zakat_snapshots.id = zakat_liability_items.snapshot_id
            AND zakat_snapshots.profile_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_zakat_snapshots_profile ON zakat_snapshots(profile_id);
CREATE INDEX idx_zakat_snapshots_date ON zakat_snapshots(snapshot_date);
CREATE INDEX idx_zakat_asset_items_snapshot ON zakat_asset_items(snapshot_id);
CREATE INDEX idx_zakat_liability_items_snapshot ON zakat_liability_items(snapshot_id);
CREATE INDEX idx_gold_silver_prices_date ON gold_silver_prices(date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_zakat_settings_updated_at
    BEFORE UPDATE ON zakat_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gold_silver_prices_updated_at
    BEFORE UPDATE ON gold_silver_prices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

