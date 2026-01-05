-- =====================================================
-- HOUSEHOLD FINANCIAL MANAGEMENT APPLICATION SCHEMA
-- Database: PostgreSQL (Supabase)
-- Version: 2.0
-- Last Updated: 2026-01-04
-- =====================================================

-- =====================================================
-- TABLES
-- =====================================================

-- 1. HOUSEHOLDS TABLE
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PROFILES TABLE (Extends Auth.Users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    household_id UUID REFERENCES households(id) ON DELETE SET NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. HOUSEHOLD MEMBERS TABLE
CREATE TABLE IF NOT EXISTS household_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (household_id, profile_id)
);

-- 4. EXPENSE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. INCOME TABLE
CREATE TABLE IF NOT EXISTS income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    owner_profile_id UUID REFERENCES profiles(id),
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    visibility TEXT DEFAULT 'household' CHECK (visibility IN ('private', 'household', 'custom')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. GOALS TABLE
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    owner_profile_id UUID REFERENCES profiles(id),
    name TEXT NOT NULL,
    target_amount DECIMAL(12,2) NOT NULL,
    saved_amount DECIMAL(12,2) DEFAULT 0,
    allocation_percentage INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0,
    deadline DATE,
    visibility TEXT DEFAULT 'household' CHECK (visibility IN ('private', 'household', 'custom')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. GOAL DISTRIBUTIONS (History of savings allocation)
CREATE TABLE IF NOT EXISTS goal_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    distributed_at TIMESTAMPTZ DEFAULT now()
);

-- 8. EXPENSE TEMPLATES (Define Rule for expenses)
CREATE TABLE IF NOT EXISTS expense_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    owner_profile_id UUID REFERENCES profiles(id),
    name TEXT NOT NULL,
    default_amount DECIMAL(12,2) NOT NULL,
    is_fixed BOOLEAN DEFAULT FALSE,
    recurrence TEXT CHECK (recurrence IN ('monthly', 'quarterly', 'yearly')),
    due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
    visibility TEXT DEFAULT 'household' CHECK (visibility IN ('private', 'household', 'custom')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. EXPENSE PAYMENTS
CREATE TABLE IF NOT EXISTS expense_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_template_id UUID REFERENCES expense_templates(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. LOANS TABLE
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    owner_profile_id UUID REFERENCES profiles(id),
    lender_name TEXT NOT NULL,
    loan_type TEXT,
    principal_amount NUMERIC(12,2) NOT NULL,
    interest_rate NUMERIC(5,2) NOT NULL,
    tenure_months INTEGER,
    emi_amount NUMERIC(12,2),
    start_date DATE NOT NULL,
    calculated_emi NUMERIC(12,2) NOT NULL,
    calculated_tenure INTEGER NOT NULL,
    total_payable NUMERIC(12,2) NOT NULL,
    total_interest NUMERIC(12,2) NOT NULL,
    outstanding_principal NUMERIC(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'closed_early')),
    interest_type TEXT NOT NULL DEFAULT 'reducing' CHECK (interest_type IN ('reducing', 'fixed')),
    visibility TEXT DEFAULT 'household' CHECK (visibility IN ('private', 'household', 'custom')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. LOAN INSTALLMENTS TABLE
CREATE TABLE IF NOT EXISTS loan_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    installment_month DATE NOT NULL CHECK (installment_month = date_trunc('month', installment_month)),
    emi_amount NUMERIC(12,2) NOT NULL,
    principal_component NUMERIC(12,2) NOT NULL,
    interest_component NUMERIC(12,2) NOT NULL,
    paid BOOLEAN DEFAULT FALSE,
    paid_on DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (loan_id, installment_month)
);

-- 12. RECORD SHARES TABLE (For custom visibility)
CREATE TABLE IF NOT EXISTS record_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (table_name, record_id, profile_id)
);

-- 13. INVESTMENT INSTRUMENTS TABLE
CREATE TABLE IF NOT EXISTS investment_instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('mutual_fund', 'stock', 'bond', 'other')),
    isin_or_symbol TEXT,
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. INVESTMENT PLANS TABLE
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

-- 15. INVESTMENT TRANSACTIONS TABLE
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

-- 16. GOLD AND SILVER PRICES TABLE (Zakat)
CREATE TABLE IF NOT EXISTS gold_silver_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    gold_price_per_gram_usd DECIMAL(10,2) NOT NULL,
    silver_price_per_gram_usd DECIMAL(10,2) NOT NULL,
    exchange_rate_usd_to_inr DECIMAL(10,4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 17. ZAKAT SETTINGS TABLE
CREATE TABLE IF NOT EXISTS zakat_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    anniversary_date DATE NOT NULL,
    nisab_type TEXT NOT NULL DEFAULT 'silver' CHECK (nisab_type IN ('silver', 'gold')),
    school_of_thought TEXT NOT NULL DEFAULT 'hanafi' CHECK (school_of_thought IN ('hanafi', 'shafi', 'maliki', 'hanbali')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 18. ZAKAT SNAPSHOTS TABLE
CREATE TABLE IF NOT EXISTS zakat_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    zakat_year_start DATE NOT NULL,
    zakat_year_end DATE NOT NULL,
    total_zakatable_assets DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_deductible_liabilities DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_zakatable_wealth DECIMAL(12,2) NOT NULL DEFAULT 0,
    nisab_threshold DECIMAL(12,2) NOT NULL,
    nisab_type TEXT NOT NULL CHECK (nisab_type IN ('silver', 'gold')),
    zakat_due DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (profile_id, snapshot_date)
);

-- 19. ZAKAT ASSET ITEMS TABLE
CREATE TABLE IF NOT EXISTS zakat_asset_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES zakat_snapshots(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL CHECK (asset_type IN (
        'cash', 'bank_balance', 'savings', 'emergency_fund',
        'investment', 'gold', 'silver', 'receivable', 'other'
    )),
    asset_name TEXT NOT NULL,
    source_type TEXT,
    source_id UUID,
    market_value DECIMAL(12,2) NOT NULL,
    is_included BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 20. ZAKAT LIABILITY ITEMS TABLE
CREATE TABLE IF NOT EXISTS zakat_liability_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES zakat_snapshots(id) ON DELETE CASCADE,
    liability_type TEXT NOT NULL CHECK (liability_type IN (
        'emi', 'credit_card', 'short_term_debt', 'unpaid_bill', 'other'
    )),
    liability_name TEXT NOT NULL,
    source_type TEXT,
    source_id UUID,
    amount_due_next_12_months DECIMAL(12,2) NOT NULL,
    is_included BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_loans_household ON loans(household_id);
CREATE INDEX IF NOT EXISTS idx_installments_household ON loan_installments(household_id);
CREATE INDEX IF NOT EXISTS idx_installments_loan_paid ON loan_installments(loan_id, paid);
CREATE INDEX IF NOT EXISTS idx_investment_plans_household ON investment_plans(household_id);
CREATE INDEX IF NOT EXISTS idx_investment_plans_owner ON investment_plans(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_plan ON investment_transactions(plan_id);
CREATE INDEX IF NOT EXISTS idx_zakat_snapshots_profile ON zakat_snapshots(profile_id);
CREATE INDEX IF NOT EXISTS idx_zakat_snapshots_date ON zakat_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_zakat_asset_items_snapshot ON zakat_asset_items(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_zakat_liability_items_snapshot ON zakat_liability_items(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_gold_silver_prices_date ON gold_silver_prices(date);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_silver_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE zakat_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE zakat_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE zakat_asset_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE zakat_liability_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "View household profiles" ON profiles;
CREATE POLICY "View household profiles" ON profiles 
    FOR SELECT USING (
        id = auth.uid()
        OR household_id = get_user_household_id()
    );

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles 
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles 
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Households Policies
DROP POLICY IF EXISTS "Users can view households they belong to or created" ON households;
CREATE POLICY "Users can view households they belong to or created" ON households 
    FOR SELECT USING (
        auth.uid() = created_by OR 
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.household_id = households.id)
    );

DROP POLICY IF EXISTS "Anyone can create a household" ON households;
CREATE POLICY "Anyone can create a household" ON households 
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Household Members Policies
DROP POLICY IF EXISTS "View household members" ON household_members;
CREATE POLICY "View household members" ON household_members
    FOR SELECT USING (
        household_id = get_user_household_id()
        OR profile_id = auth.uid()
    );

-- Income Policies
DROP POLICY IF EXISTS "Household members can manage income" ON income;
DROP POLICY IF EXISTS "View Income" ON income;
CREATE POLICY "View Income" ON income FOR SELECT USING (
    owner_profile_id = auth.uid()
    OR 
    (visibility = 'household' AND household_id IN (SELECT household_id FROM household_members WHERE profile_id = auth.uid()))
    OR
    (visibility = 'custom' AND has_custom_access('income', id))
);

DROP POLICY IF EXISTS "Manage Own Income" ON income;
CREATE POLICY "Manage Own Income" ON income FOR ALL USING (
    owner_profile_id = auth.uid()
);

-- Goals Policies
DROP POLICY IF EXISTS "Household members can manage goals" ON goals;
DROP POLICY IF EXISTS "View Goals" ON goals;
CREATE POLICY "View Goals" ON goals FOR SELECT USING (
    owner_profile_id = auth.uid()
    OR 
    (visibility = 'household' AND household_id IN (SELECT household_id FROM household_members WHERE profile_id = auth.uid()))
    OR
    (visibility = 'custom' AND has_custom_access('goals', id))
);

DROP POLICY IF EXISTS "Manage Own Goals" ON goals;
CREATE POLICY "Manage Own Goals" ON goals FOR ALL USING (
    owner_profile_id = auth.uid()
);

-- Goal Distributions Policies
DROP POLICY IF EXISTS "Household members can manage distributions" ON goal_distributions;
CREATE POLICY "Household members can manage distributions" ON goal_distributions 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM goals 
            JOIN profiles ON goals.household_id = profiles.household_id
            WHERE profiles.id = auth.uid() AND goal_distributions.goal_id = goals.id
        )
    );

-- Expense Categories Policies
DROP POLICY IF EXISTS "Household members can manage categories" ON expense_categories;
CREATE POLICY "Household members can manage categories" ON expense_categories 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.household_id = expense_categories.household_id)
    );

-- Expense Templates Policies
DROP POLICY IF EXISTS "Household members can manage expense templates" ON expense_templates;
DROP POLICY IF EXISTS "View Expense Templates" ON expense_templates;
CREATE POLICY "View Expense Templates" ON expense_templates FOR SELECT USING (
    owner_profile_id = auth.uid()
    OR 
    (visibility = 'household' AND household_id IN (SELECT household_id FROM household_members WHERE profile_id = auth.uid()))
    OR
    (visibility = 'custom' AND has_custom_access('expense_templates', id))
);

DROP POLICY IF EXISTS "Manage Own Expense Templates" ON expense_templates;
CREATE POLICY "Manage Own Expense Templates" ON expense_templates FOR ALL USING (
    owner_profile_id = auth.uid()
);

-- Expense Payments Policies
DROP POLICY IF EXISTS "Household members can manage expense payments" ON expense_payments;
CREATE POLICY "Household members can manage expense payments" ON expense_payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM expense_templates et
            JOIN profiles p ON p.household_id = et.household_id
            WHERE et.id = expense_payments.expense_template_id AND p.id = auth.uid()
        )
    );

-- Loans Policies
DROP POLICY IF EXISTS "household loans access" ON loans;
DROP POLICY IF EXISTS "View Loans" ON loans;
CREATE POLICY "View Loans" ON loans FOR SELECT USING (
    owner_profile_id = auth.uid()
    OR 
    (visibility = 'household' AND household_id IN (SELECT household_id FROM household_members WHERE profile_id = auth.uid()))
    OR
    (visibility = 'custom' AND has_custom_access('loans', id))
);

DROP POLICY IF EXISTS "Manage Own Loans" ON loans;
CREATE POLICY "Manage Own Loans" ON loans FOR ALL USING (
    owner_profile_id = auth.uid()
);

-- Loan Installments Policies
DROP POLICY IF EXISTS "household loan installments access" ON loan_installments;
DROP POLICY IF EXISTS "View Loan Installments" ON loan_installments;
CREATE POLICY "View Loan Installments" ON loan_installments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM loans 
        WHERE loans.id = loan_installments.loan_id 
        AND (
            loans.owner_profile_id = auth.uid()
            OR (loans.visibility = 'household' AND loans.household_id IN (SELECT household_id FROM household_members WHERE profile_id = auth.uid()))
            OR (loans.visibility = 'custom' AND has_custom_access('loans', loans.id))
        )
    )
);

DROP POLICY IF EXISTS "Manage Loan Installments via Loan Owner" ON loan_installments;
CREATE POLICY "Manage Loan Installments via Loan Owner" ON loan_installments FOR ALL USING (
    EXISTS (
        SELECT 1 FROM loans
        WHERE loans.id = loan_installments.loan_id
        AND loans.owner_profile_id = auth.uid()
    )
);

-- Record Shares Policies
DROP POLICY IF EXISTS "View Record Shares" ON record_shares;
DROP POLICY IF EXISTS "View Investment Shares" ON record_shares;
CREATE POLICY "View Record Shares" ON record_shares FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM income WHERE income.id = record_shares.record_id 
        AND record_shares.table_name = 'income' AND income.owner_profile_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM goals WHERE goals.id = record_shares.record_id 
        AND record_shares.table_name = 'goals' AND goals.owner_profile_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM loans WHERE loans.id = record_shares.record_id 
        AND record_shares.table_name = 'loans' AND loans.owner_profile_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM expense_templates WHERE expense_templates.id = record_shares.record_id 
        AND record_shares.table_name = 'expense_templates' AND expense_templates.owner_profile_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM investment_plans WHERE investment_plans.id = record_shares.record_id 
        AND record_shares.table_name = 'investment_plans' AND investment_plans.owner_profile_id = auth.uid()
    )
    OR profile_id = auth.uid()
);

DROP POLICY IF EXISTS "Manage Record Shares" ON record_shares;
DROP POLICY IF EXISTS "Manage Investment Shares" ON record_shares;
CREATE POLICY "Manage Record Shares" ON record_shares FOR ALL USING (
    EXISTS (
        SELECT 1 FROM income WHERE income.id = record_shares.record_id 
        AND record_shares.table_name = 'income' AND income.owner_profile_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM goals WHERE goals.id = record_shares.record_id 
        AND record_shares.table_name = 'goals' AND goals.owner_profile_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM loans WHERE loans.id = record_shares.record_id 
        AND record_shares.table_name = 'loans' AND loans.owner_profile_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM expense_templates WHERE expense_templates.id = record_shares.record_id 
        AND record_shares.table_name = 'expense_templates' AND expense_templates.owner_profile_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM investment_plans WHERE investment_plans.id = record_shares.record_id 
        AND record_shares.table_name = 'investment_plans' AND investment_plans.owner_profile_id = auth.uid()
    )
);

-- Investment Instruments Policies
DROP POLICY IF EXISTS "Everyone can read instruments" ON investment_instruments;
CREATE POLICY "Everyone can read instruments" ON investment_instruments
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can create instruments" ON investment_instruments;
CREATE POLICY "Authenticated can create instruments" ON investment_instruments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Investment Plans Policies
DROP POLICY IF EXISTS "View Investment Plans" ON investment_plans;
CREATE POLICY "View Investment Plans" ON investment_plans FOR SELECT USING (
    owner_profile_id = auth.uid()
    OR 
    (visibility = 'household' AND household_id = get_user_household_id())
    OR
    (visibility = 'custom' AND has_custom_access('investment_plans', id))
);

DROP POLICY IF EXISTS "Manage Own Investment Plans" ON investment_plans;
CREATE POLICY "Manage Own Investment Plans" ON investment_plans FOR ALL USING (
    owner_profile_id = auth.uid()
);

-- Investment Transactions Policies
DROP POLICY IF EXISTS "View Investment Transactions" ON investment_transactions;
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

DROP POLICY IF EXISTS "Manage Investment Transactions via Plan Owner" ON investment_transactions;
CREATE POLICY "Manage Investment Transactions via Plan Owner" ON investment_transactions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM investment_plans p
        WHERE p.id = investment_transactions.plan_id
        AND p.owner_profile_id = auth.uid()
    )
);

-- Gold/Silver Prices Policies (Zakat)
DROP POLICY IF EXISTS "Authenticated can read prices" ON gold_silver_prices;
CREATE POLICY "Authenticated can read prices" ON gold_silver_prices
    FOR SELECT USING (auth.role() = 'authenticated');

-- Zakat Settings Policies
DROP POLICY IF EXISTS "Users can manage own zakat settings" ON zakat_settings;
CREATE POLICY "Users can manage own zakat settings" ON zakat_settings
    FOR ALL USING (profile_id = auth.uid());

-- Zakat Snapshots Policies
DROP POLICY IF EXISTS "Users can view own snapshots" ON zakat_snapshots;
CREATE POLICY "Users can view own snapshots" ON zakat_snapshots
    FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own snapshots" ON zakat_snapshots;
CREATE POLICY "Users can create own snapshots" ON zakat_snapshots
    FOR INSERT WITH CHECK (profile_id = auth.uid());

-- Zakat Asset Items Policies
DROP POLICY IF EXISTS "Users can view own asset items" ON zakat_asset_items;
CREATE POLICY "Users can view own asset items" ON zakat_asset_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM zakat_snapshots
            WHERE zakat_snapshots.id = zakat_asset_items.snapshot_id
            AND zakat_snapshots.profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage own asset items" ON zakat_asset_items;
CREATE POLICY "Users can manage own asset items" ON zakat_asset_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM zakat_snapshots
            WHERE zakat_snapshots.id = zakat_asset_items.snapshot_id
            AND zakat_snapshots.profile_id = auth.uid()
        )
    );

-- Zakat Liability Items Policies
DROP POLICY IF EXISTS "Users can view own liability items" ON zakat_liability_items;
CREATE POLICY "Users can view own liability items" ON zakat_liability_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM zakat_snapshots
            WHERE zakat_snapshots.id = zakat_liability_items.snapshot_id
            AND zakat_snapshots.profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage own liability items" ON zakat_liability_items;
CREATE POLICY "Users can manage own liability items" ON zakat_liability_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM zakat_snapshots
            WHERE zakat_snapshots.id = zakat_liability_items.snapshot_id
            AND zakat_snapshots.profile_id = auth.uid()
        )
    );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get current user's household ID
CREATE OR REPLACE FUNCTION get_user_household_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT household_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_user_household_id() TO authenticated;

-- Check custom access for record sharing
CREATE OR REPLACE FUNCTION has_custom_access(
    p_table_name TEXT,
    p_record_id UUID
) 
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM record_shares 
        WHERE table_name = p_table_name 
        AND record_id = p_record_id 
        AND profile_id = auth.uid()
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Update timestamp helper
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS & TRIGGER FUNCTIONS
-- =====================================================

-- Set household owner on creation
CREATE OR REPLACE FUNCTION set_household_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by := auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_household_created ON households;
CREATE TRIGGER on_household_created
    BEFORE INSERT ON households
    FOR EACH ROW EXECUTE PROCEDURE set_household_owner();

-- Handle profile creation on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (new.id, new.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Validate installment household matches loan household
CREATE OR REPLACE FUNCTION validate_installment_household()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM loans
        WHERE id = NEW.loan_id AND household_id = NEW.household_id
    ) THEN
        RAISE EXCEPTION 'Loan and installment household mismatch';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_installment_household ON loan_installments;
CREATE TRIGGER trg_validate_installment_household
    BEFORE INSERT OR UPDATE ON loan_installments
    FOR EACH ROW EXECUTE FUNCTION validate_installment_household();

-- Update loan outstanding principal when installment is paid
CREATE OR REPLACE FUNCTION update_loan_outstanding()
RETURNS TRIGGER AS $
BEGIN
    IF NEW.paid = TRUE AND OLD.paid = FALSE THEN
        UPDATE loans
        SET outstanding_principal = outstanding_principal - NEW.principal_component
        WHERE id = NEW.loan_id;
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_loan_outstanding ON loan_installments;
CREATE TRIGGER trg_update_loan_outstanding
    AFTER UPDATE OF paid ON loan_installments
    FOR EACH ROW EXECUTE FUNCTION update_loan_outstanding();

-- Close loan automatically when fully paid
CREATE OR REPLACE FUNCTION close_loan_if_completed()
RETURNS TRIGGER AS $
BEGIN
    IF NEW.outstanding_principal <= 0 THEN
        UPDATE loans SET status = 'completed' WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_close_loan ON loans;
CREATE TRIGGER trg_close_loan
    AFTER UPDATE ON loans
    FOR EACH ROW
    WHEN (NEW.outstanding_principal <= 0)
    EXECUTE FUNCTION close_loan_if_completed();

-- Prevent editing paid installments
CREATE OR REPLACE FUNCTION prevent_paid_installment_edit()
RETURNS TRIGGER AS $
BEGIN
    IF OLD.paid = TRUE THEN
        RAISE EXCEPTION 'Paid installments cannot be modified';
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_paid_installments ON loan_installments;
CREATE TRIGGER trg_lock_paid_installments
    BEFORE UPDATE ON loan_installments
    FOR EACH ROW EXECUTE FUNCTION prevent_paid_installment_edit();

-- Update timestamps for zakat tables
DROP TRIGGER IF EXISTS update_zakat_settings_updated_at ON zakat_settings;
CREATE TRIGGER update_zakat_settings_updated_at
    BEFORE UPDATE ON zakat_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gold_silver_prices_updated_at ON gold_silver_prices;
CREATE TRIGGER update_gold_silver_prices_updated_at
    BEFORE UPDATE ON gold_silver_prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- BUSINESS LOGIC FUNCTIONS
-- =====================================================

-- Create new household with user profile
CREATE OR REPLACE FUNCTION create_new_household(
    h_name TEXT,
    u_name TEXT
)
RETURNS UUID AS $
DECLARE
    new_h_id UUID;
    uid UUID := auth.uid();
BEGIN
    IF uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    INSERT INTO households (name, created_by)
    VALUES (h_name, uid)
    RETURNING id INTO new_h_id;

    INSERT INTO profiles (id, household_id, full_name, role)
    VALUES (uid, new_h_id, u_name, 'member')
    ON CONFLICT (id) DO UPDATE SET
        household_id = new_h_id,
        full_name = u_name,
        role = 'member';
    
    -- Add to household_members as owner
    INSERT INTO household_members (household_id, profile_id, role)
    VALUES (new_h_id, uid, 'owner')
    ON CONFLICT (household_id, profile_id) DO UPDATE SET role = 'owner';

    RETURN new_h_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Join existing household
CREATE OR REPLACE FUNCTION join_existing_household(p_household_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
    v_uid UUID := auth.uid();
    v_exists BOOLEAN;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT EXISTS (SELECT 1 FROM households WHERE id = p_household_id) INTO v_exists;
    IF NOT v_exists THEN
        RAISE EXCEPTION 'Invalid Household ID';
    END IF;

    UPDATE profiles 
    SET household_id = p_household_id, role = 'member'
    WHERE id = v_uid;

    INSERT INTO household_members (household_id, profile_id, role)
    VALUES (p_household_id, v_uid, 'member')
    ON CONFLICT (household_id, profile_id) DO NOTHING;
END;
$;

-- Create fixed expense template
CREATE OR REPLACE FUNCTION create_fixed_expense(
    p_name TEXT,
    p_amount DECIMAL,
    p_category_id UUID,
    p_recurrence TEXT,
    p_due_day INTEGER
)
RETURNS UUID AS $
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO expense_templates (
        household_id,
        category_id,
        owner_profile_id,
        name,
        default_amount,
        is_fixed,
        recurrence,
        due_day,
        visibility
    )
    SELECT
        household_id,
        p_category_id,
        id,
        p_name,
        p_amount,
        TRUE,
        p_recurrence,
        p_due_day,
        'household'
    FROM profiles
    WHERE id = auth.uid()
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate loan installments schedule
CREATE OR REPLACE FUNCTION generate_loan_installments(
    p_loan_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
    v_household_id UUID;
    v_principal NUMERIC;
    v_rate NUMERIC;
    v_emi NUMERIC;
    v_tenure INTEGER;
    v_start_date DATE;
    v_interest_type TEXT;
    v_balance NUMERIC;
    v_interest NUMERIC;
    v_principal_component NUMERIC;
    v_total_interest NUMERIC;
    v_start_month DATE;
    i INTEGER;
BEGIN
    SELECT
        household_id,
        principal_amount,
        interest_rate,
        calculated_emi,
        calculated_tenure,
        start_date,
        interest_type
    INTO
        v_household_id,
        v_principal,
        v_rate,
        v_emi,
        v_tenure,
        v_start_date,
        v_interest_type
    FROM loans
    WHERE id = p_loan_id;

    v_start_month := date_trunc('month', v_start_date);
    
    IF v_interest_type = 'fixed' THEN
        v_total_interest := ROUND(v_principal * (v_rate / 100.0) * (v_tenure / 12.0), 2);
        v_principal_component := ROUND(v_principal / v_tenure, 2);
        v_interest := ROUND(v_total_interest / v_tenure, 2);
        
        FOR i IN 1..v_tenure LOOP
            INSERT INTO loan_installments (
                loan_id,
                household_id,
                installment_month,
                emi_amount,
                principal_component,
                interest_component
            ) VALUES (
                p_loan_id,
                v_household_id,
                v_start_month + (i - 1) * INTERVAL '1 month',
                v_emi,
                v_principal_component,
                v_interest
            );
        END LOOP;
    ELSE
        v_balance := v_principal;
        v_rate := v_rate / 1200;

        FOR i IN 1..v_tenure LOOP
            v_interest := ROUND(v_balance * v_rate, 2);
            v_principal_component := ROUND(v_emi - v_interest, 2);

            IF i = v_tenure THEN
                v_principal_component := v_balance;
                v_emi := v_principal_component + v_interest;
            END IF;

            INSERT INTO loan_installments (
                loan_id,
                household_id,
                installment_month,
                emi_amount,
                principal_component,
                interest_component
            ) VALUES (
                p_loan_id,
                v_household_id,
                v_start_month + (i - 1) * INTERVAL '1 month',
                v_emi,
                v_principal_component,
                v_interest
            );

            v_balance := v_balance - v_principal_component;
        END LOOP;
    END IF;
END;
$;

-- Recalculate loan schedule after prepayment (for reducing balance loans)
CREATE OR REPLACE FUNCTION recalculate_loan_schedule(p_loan_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
    v_loan RECORD;
    v_balance NUMERIC;
    v_rate NUMERIC;
    v_new_interest NUMERIC;
    v_new_principal_component NUMERIC;
    v_installment RECORD;
BEGIN
    SELECT * INTO v_loan FROM loans WHERE id = p_loan_id;
    
    IF v_loan.interest_type = 'fixed' THEN 
        RETURN; 
    END IF;

    v_balance := v_loan.outstanding_principal;
    v_rate := v_loan.interest_rate / 1200;

    FOR v_installment IN 
        SELECT * FROM loan_installments 
        WHERE loan_id = p_loan_id AND paid = FALSE 
        ORDER BY installment_month ASC
    LOOP
        IF v_balance <= 0 THEN
            DELETE FROM loan_installments WHERE id = v_installment.id;
        ELSE
            v_new_interest := ROUND(v_balance * v_rate, 2);
            v_new_principal_component := ROUND(v_loan.emi_amount - v_new_interest, 2);
            
            IF v_balance < v_new_principal_component THEN
                v_new_principal_component := v_balance;
                
                UPDATE loan_installments 
                SET emi_amount = v_new_principal_component + v_new_interest,
                    principal_component = v_new_principal_component,
                    interest_component = v_new_interest
                WHERE id = v_installment.id;
                
                v_balance := 0;
            ELSE
                UPDATE loan_installments 
                SET principal_component = v_new_principal_component,
                    interest_component = v_new_interest
                WHERE id = v_installment.id;
                
                v_balance := v_balance - v_new_principal_component;
            END IF;
        END IF;
    END LOOP;
END;
$;

-- Apply loan prepayment with recalculation
CREATE OR REPLACE FUNCTION apply_loan_prepayment(
    p_installment_id UUID,
    p_extra_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
    v_loan_id UUID;
    v_interest_type TEXT;
    v_outstanding_principal NUMERIC;
    v_emi NUMERIC;
    v_installment_month DATE;
    v_total_original_interest NUMERIC;
    v_interest_paid_so_far NUMERIC;
    v_remaining_interest NUMERIC;
    v_total_liability NUMERIC;
    v_months_needed INTEGER;
    v_monthly_interest NUMERIC;
    v_monthly_principal NUMERIC;
    v_household_id UUID;
    j INTEGER;
BEGIN
    SELECT l.id, l.interest_type, l.outstanding_principal, l.calculated_emi, 
           l.total_interest, l.household_id, li.installment_month
    INTO v_loan_id, v_interest_type, v_outstanding_principal, v_emi, 
         v_total_original_interest, v_household_id, v_installment_month
    FROM loan_installments li
    JOIN loans l ON l.id = li.loan_id
    WHERE li.id = p_installment_id;

    UPDATE loan_installments
    SET paid = TRUE, paid_on = CURRENT_DATE
    WHERE id = p_installment_id;

    v_outstanding_principal := GREATEST(v_outstanding_principal - p_extra_amount, 0);
    
    UPDATE loans
    SET outstanding_principal = v_outstanding_principal
    WHERE id = v_loan_id;

    DELETE FROM loan_installments 
    WHERE loan_id = v_loan_id 
      AND paid = FALSE 
      AND installment_month > v_installment_month;

    IF v_outstanding_principal <= 0 THEN
        UPDATE loans SET status = 'completed' WHERE id = v_loan_id;
        RETURN;
    END IF;

    IF v_interest_type = 'fixed' THEN
        SELECT COALESCE(SUM(interest_component), 0) INTO v_interest_paid_so_far
        FROM loan_installments
        WHERE loan_id = v_loan_id AND paid = TRUE;
        
        v_remaining_interest := GREATEST(v_total_original_interest - v_interest_paid_so_far, 0);
        v_total_liability := v_outstanding_principal + v_remaining_interest;
        
        IF v_emi > 0 THEN
            v_months_needed := CEIL(v_total_liability / v_emi);
        ELSE
            v_months_needed := 0;
        END IF;
        
        IF v_months_needed > 0 THEN
            v_monthly_interest := ROUND(v_remaining_interest / v_months_needed, 2);
            v_monthly_principal := ROUND(v_outstanding_principal / v_months_needed, 2);
            
            FOR j IN 1..v_months_needed LOOP
                INSERT INTO loan_installments (
                    loan_id,
                    household_id,
                    installment_month,
                    emi_amount,
                    principal_component,
                    interest_component
                ) VALUES (
                    v_loan_id,
                    v_household_id,
                    v_installment_month + j * INTERVAL '1 month',
                    v_emi,
                    v_monthly_principal,
                    v_monthly_interest
                );
            END LOOP;
        END IF;
    ELSE
        PERFORM recalculate_loan_schedule(v_loan_id);
    END IF;
END;
$;

-- Close loan early (pay off completely)
CREATE OR REPLACE FUNCTION close_loan_early(
    p_loan_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
    UPDATE loans
    SET status = 'closed_early',
        outstanding_principal = 0
    WHERE id = p_loan_id;

    UPDATE loan_installments
    SET paid = TRUE,
        paid_on = CURRENT_DATE
    WHERE loan_id = p_loan_id AND paid = FALSE;
END;
$;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_user_household_id() TO authenticated;
GRANT EXECUTE ON FUNCTION has_custom_access(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_new_household(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION join_existing_household(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_fixed_expense(TEXT, DECIMAL, UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_loan_installments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_loan_schedule(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_loan_prepayment(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION close_loan_early(UUID) TO authenticated;

-- =====================================================
-- DATA BACKFILL (Run only once after migration)
-- =====================================================

-- Backfill household_members from profiles
INSERT INTO household_members (household_id, profile_id, role)
SELECT 
    p.household_id, 
    p.id, 
    CASE 
        WHEN h.created_by = p.id THEN 'owner'
        ELSE COALESCE(p.role, 'member')
    END
FROM profiles p
JOIN households h ON p.household_id = h.id
WHERE p.household_id IS NOT NULL
ON CONFLICT (household_id, profile_id) DO NOTHING;

-- Backfill owner_profile_id for income
UPDATE income 
SET owner_profile_id = profile_id, visibility = 'household' 
WHERE owner_profile_id IS NULL AND profile_id IS NOT NULL;

-- Backfill owner_profile_id for expense_templates
UPDATE expense_templates et
SET owner_profile_id = h.created_by, visibility = 'household'
FROM households h
WHERE et.household_id = h.id AND et.owner_profile_id IS NULL;

-- Backfill owner_profile_id for goals
UPDATE goals g
SET owner_profile_id = h.created_by, visibility = 'household'
FROM households h
WHERE g.household_id = h.id AND g.owner_profile_id IS NULL;

-- Backfill owner_profile_id for loans
UPDATE loans l
SET owner_profile_id = h.created_by, visibility = 'household'
FROM households h
WHERE l.household_id = h.id AND l.owner_profile_id IS NULL;

-- =====================================================
-- END OF SCHEMA
-- =====================================================