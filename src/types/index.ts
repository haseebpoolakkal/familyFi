export type Visibility = 'private' | 'household' | 'custom';

export type Profile = {
    id: string;
    household_id: string;
    full_name: string;
    role: 'admin' | 'member';
};

export type Income = {
    id: string;
    household_id: string;
    profile_id: string;
    amount: number;
    type: 'fixed' | 'freelance';
    date: string;
    description: string;
    owner_profile_id: string;
    visibility: Visibility;
};

export type Expense = {
    id: string;
    household_id: string;
    category_id?: string;
    amount: number;
    is_fixed: boolean;
    is_paid: boolean;
    due_date: string;
    paid_at?: string;
    description: string;
    status: 'active' | 'completed' | 'closed';
    // Note: Expense might refer to payment or template, adding fields optionally or to base if applicable
    // But Expense seems to be a UI view. Let's start with backend services types.
};

export type Goal = {
    id: string;
    household_id: string;
    name: string;
    target_amount: number;
    saved_amount: number;
    allocation_percentage: number;
    priority: number;
    owner_profile_id: string;
    visibility: Visibility;
};

export type InvestmentType = 'mutual_fund' | 'stock' | 'bond' | 'other';
export type InvestmentFrequency = 'monthly' | 'quarterly' | 'yearly';
export type InvestmentStatus = 'active' | 'paused' | 'completed';
export type InvestmentTransactionType = 'buy' | 'sell' | 'dividend';

export type InvestmentInstrument = {
    id: string;
    name: string;
    type: InvestmentType;
    isin_or_symbol?: string;
    risk_level?: 'low' | 'medium' | 'high';
    created_at: string;
};

export type InvestmentPlan = {
    id: string;
    household_id: string;
    owner_profile_id: string;
    instrument_id: string;
    goal_id?: string;
    amount: number;
    frequency: InvestmentFrequency;
    start_date: string;
    end_date?: string;
    status: InvestmentStatus;
    visibility: Visibility;
    created_at: string;
    // Relations
    instrument?: InvestmentInstrument;
    current_value?: number; // Calculated field
};

export type InvestmentTransaction = {
    id: string;
    plan_id: string;
    transaction_date: string;
    amount: number;
    units?: number;
    nav?: number;
    transaction_type: InvestmentTransactionType;
    created_at: string;
};

// Zakat Types
export type NisabType = 'silver' | 'gold';
export type SchoolOfThought = 'hanafi' | 'shafi' | 'maliki' | 'hanbali';
export type ZakatAssetType = 'cash' | 'bank_balance' | 'savings' | 'emergency_fund' | 'investment' | 'gold' | 'silver' | 'receivable' | 'other';
export type ZakatLiabilityType = 'emi' | 'credit_card' | 'short_term_debt' | 'unpaid_bill' | 'other';

export type ZakatSettings = {
    id: string;
    profile_id: string;
    anniversary_date: string; // Date in YYYY-MM-DD format
    nisab_type: NisabType;
    school_of_thought: SchoolOfThought;
    created_at: string;
    updated_at: string;
};

export type ZakatSnapshot = {
    id: string;
    profile_id: string;
    snapshot_date: string;
    zakat_year_start: string;
    zakat_year_end: string;
    total_zakatable_assets: number;
    total_deductible_liabilities: number;
    net_zakatable_wealth: number;
    nisab_threshold: number;
    nisab_type: NisabType;
    zakat_due: number;
    created_at: string;
    // Relations
    asset_items?: ZakatAssetItem[];
    liability_items?: ZakatLiabilityItem[];
};

export type ZakatAssetItem = {
    id: string;
    snapshot_id: string;
    asset_type: ZakatAssetType;
    asset_name: string;
    source_type?: string;
    source_id?: string;
    market_value: number;
    is_included: boolean;
    notes?: string;
    created_at: string;
};

export type ZakatLiabilityItem = {
    id: string;
    snapshot_id: string;
    liability_type: ZakatLiabilityType;
    liability_name: string;
    source_type?: string;
    source_id?: string;
    amount_due_next_12_months: number;
    is_included: boolean;
    notes?: string;
    created_at: string;
};

export type GoldSilverPrice = {
    id: string;
    date: string;
    gold_price_per_gram_usd: number;
    silver_price_per_gram_usd: number;
    exchange_rate_usd_to_inr: number;
    created_at: string;
    updated_at: string;
};
