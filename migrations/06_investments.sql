-- 1. Create investment_instruments table
CREATE TABLE IF NOT EXISTS investment_instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('mutual_fund', 'stock', 'bond', 'other')),
    isin_or_symbol TEXT,
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create investment_plans table
CREATE TABLE IF NOT EXISTS investment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    owner_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    instrument_id UUID NOT NULL REFERENCES investment_instruments(id) ON DELETE RESTRICT,
    goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'household', 'custom')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create investment_transactions table
CREATE TABLE IF NOT EXISTS investment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES investment_plans(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    units DECIMAL(12,4),
    nav DECIMAL(12,4),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell', 'dividend')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE investment_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Instruments (Publicly readable for now to allow selection, Writable by auth users)
CREATE POLICY "Everyone can read instruments" ON investment_instruments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can create instruments" ON investment_instruments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    
-- Plans (Strict Ownership & Visibility)
CREATE POLICY "View Investment Plans" ON investment_plans FOR SELECT USING (
    owner_profile_id = auth.uid()
    OR 
    (visibility = 'household' AND household_id = get_user_household_id())
    OR
    (visibility = 'custom' AND has_custom_access('investment_plans', id))
);

CREATE POLICY "Manage Own Investment Plans" ON investment_plans FOR ALL USING (
    owner_profile_id = auth.uid()
);

-- Transactions (Inherit access from Plan)
CREATE POLICY "View Investment Transactions" ON investment_transactions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM investment_plans p
        WHERE p.id = investment_transactions.plan_id
        AND (
            p.owner_profile_id = auth.uid()
            OR (p.visibility = 'household' AND p.household_id = get_user_household_id())
            OR (p.visibility = 'custom' AND has_custom_access('investment_plans', p.id))
        )
    )
);

CREATE POLICY "Manage Investment Transactions via Plan Owner" ON investment_transactions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM investment_plans p
        WHERE p.id = investment_transactions.plan_id
        AND p.owner_profile_id = auth.uid()
    )
);

-- 6. Update Record Shares Policies
-- Allow viewing shares for investment plans
CREATE POLICY "View Investment Shares" ON record_shares FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM investment_plans 
        WHERE investment_plans.id = record_shares.record_id 
        AND record_shares.table_name = 'investment_plans' 
        AND investment_plans.owner_profile_id = auth.uid()
    )
);

-- Allow managing shares for investment plans
CREATE POLICY "Manage Investment Shares" ON record_shares FOR ALL USING (
    EXISTS (
        SELECT 1 FROM investment_plans 
        WHERE investment_plans.id = record_shares.record_id 
        AND record_shares.table_name = 'investment_plans' 
        AND investment_plans.owner_profile_id = auth.uid()
    )
);

-- 7. Create indexes
CREATE INDEX idx_investment_plans_household ON investment_plans(household_id);
CREATE INDEX idx_investment_plans_owner ON investment_plans(owner_profile_id);
CREATE INDEX idx_investment_transactions_plan ON investment_transactions(plan_id);
