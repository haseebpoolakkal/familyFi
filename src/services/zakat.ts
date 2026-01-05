import {
    ZakatSettings,
    ZakatSnapshot,
    ZakatAssetItem,
    ZakatLiabilityItem,
    NisabType,
} from '@/types';
import { getGoldSilverPrices, calculateNisabThreshold } from './goldSilverPrices';
import { createClient } from '@/lib/supabase/client';

const ZAKAT_RATE = 0.025; // 2.5% (1/40)

/**
 * Get or create Zakat settings for a profile
 */
export async function getZakatSettings(
    profileId: string
): Promise<ZakatSettings | null> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('zakat_settings')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle();

    if (error) throw error;
    return data;
}

/**
 * Create or update Zakat settings using RPC
 */
export async function upsertZakatSettings(
    settings: {
        anniversary_date: string;
        nisab_type: NisabType;
        school_of_thought: string;
    },
): Promise<ZakatSettings> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('upsert_zakat_settings', {
        p_anniversary_date: settings.anniversary_date,
        p_nisab_type: settings.nisab_type,
        p_school_of_thought: settings.school_of_thought,
    });

    if (error) throw error;
    return data;
}

/**
 * Calculate Zakat year dates based on anniversary date
 */
export function calculateZakatYear(anniversaryDate: string, snapshotDate: string): {
    start: string;
    end: string;
} {
    const anniversary = new Date(anniversaryDate);
    const snapshot = new Date(snapshotDate);
    
    // Find the most recent anniversary before or on snapshot date
    let yearStart = new Date(anniversary);
    yearStart.setFullYear(snapshot.getFullYear());
    
    if (yearStart > snapshot) {
        yearStart.setFullYear(snapshot.getFullYear() - 1);
    }
    
    const yearEnd = new Date(yearStart);
    yearEnd.setFullYear(yearStart.getFullYear() + 1);
    yearEnd.setDate(yearEnd.getDate() - 1); // Day before next anniversary
    
    return {
        start: yearStart.toISOString().split('T')[0],
        end: yearEnd.toISOString().split('T')[0],
    };
}

/**
 * Gather zakatable assets from various sources
 * This is a pure function that reads data but doesn't modify it
 */
async function gatherZakatableAssets(
    profileId: string,
    householdId: string,
    snapshotDate: string
): Promise<Omit<ZakatAssetItem, 'id' | 'snapshot_id' | 'created_at'>[]> {
    const supabase = createClient();
    const assets: Omit<ZakatAssetItem, 'id' | 'snapshot_id' | 'created_at'>[] = [];

    // 1. Cash and Bank Balances from Goals (saved_amount)
    const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .eq('household_id', householdId);
    
    if (goals) {
        for (const goal of goals) {
            if (goal.saved_amount > 0) {
                assets.push({
                    asset_type: 'savings',
                    asset_name: `Goal: ${goal.name}`,
                    source_type: 'goal',
                    source_id: goal.id,
                    market_value: goal.saved_amount,
                    is_included: true,
                    notes: `Savings for ${goal.name}`,
                });
            }
        }
    }

    // 2. Investments (at current market value)
    const { data: investmentPlans } = await supabase
        .from('investment_plans')
        .select(`
            *,
            instrument:investment_instruments(*)
        `)
        .eq('household_id', householdId)
        .in('status', ['active', 'paused']);
    
    if (investmentPlans) {
        for (const plan of investmentPlans) {
            const { data: transactions } = await supabase
                .from('investment_transactions')
                .select('*')
                .eq('plan_id', plan.id);
            
            if (transactions) {
                // Calculate net investment (buy - sell)
                const buyAmount = transactions
                    .filter(t => t.transaction_type === 'buy')
                    .reduce((sum, t) => sum + t.amount, 0);
                const sellAmount = transactions
                    .filter(t => t.transaction_type === 'sell')
                    .reduce((sum, t) => sum + t.amount, 0);
                const netValue = buyAmount - sellAmount;
                
                if (netValue > 0) {
                    const instrument = plan.instrument as { name?: string } | null;
                    assets.push({
                        asset_type: 'investment',
                        asset_name: `Investment: ${instrument?.name || 'Unknown'}`,
                        source_type: 'investment_plan',
                        source_id: plan.id,
                        market_value: netValue,
                        is_included: true,
                        notes: `${plan.frequency} SIP of ₹${plan.amount}`,
                    });
                }
            }
        }
    }

    // 3. Income (cash on hand) - sum of income up to snapshot date
    const yearStart = new Date(snapshotDate);
    yearStart.setFullYear(yearStart.getFullYear() - 1);
    
    let incomeQuery = supabase
        .from('income')
        .select('amount')
        .eq('household_id', householdId)
        .gte('date', yearStart.toISOString().split('T')[0])
        .lte('date', snapshotDate);
    
    const { data: income } = await incomeQuery;
    const totalIncome = income ? income.reduce((sum, inc) => sum + (inc.amount || 0), 0) : 0;
    
    if (totalIncome > 0) {
        assets.push({
            asset_type: 'cash',
            asset_name: 'Cash from Income',
            source_type: 'income',
            market_value: totalIncome,
            is_included: true,
            notes: 'Total income in Zakat year',
        });
    }

    return assets;
}

/**
 * Gather deductible liabilities (only next 12 months)
 */
async function gatherDeductibleLiabilities(
    profileId: string,
    householdId: string,
    snapshotDate: string,
): Promise<Omit<ZakatLiabilityItem, 'id' | 'snapshot_id' | 'created_at'>[]> {
    const liabilities: Omit<ZakatLiabilityItem, 'id' | 'snapshot_id' | 'created_at'>[] = [];

    // 1. Loan EMIs (only next 12 months)
    const supabase = createClient();
    const { data: loans } = await supabase
        .from('loans')
        .select('*')
        .eq('household_id', householdId)
        .eq('status', 'active');
    
    if (loans) {
        for (const loan of loans) {
            // Get unpaid installments in next 12 months
            const snapshot = new Date(snapshotDate);
            const next12Months = new Date(snapshot);
            next12Months.setMonth(next12Months.getMonth() + 12);
            
            const { data: installments } = await supabase
                .from('loan_installments')
                .select('*')
                .eq('loan_id', loan.id)
                .eq('household_id', householdId)
                .eq('paid', false)
                .gte('installment_month', snapshotDate)
                .lte('installment_month', next12Months.toISOString().split('T')[0]);
            
            if (installments) {
                const unpaidInstallments = installments;
                const totalEMI = unpaidInstallments.reduce((sum, i) => sum + i.emi_amount, 0);
                
                // If fewer than 12 installments, use remaining
                const monthsRemaining = Math.min(12, unpaidInstallments.length);
                const emiDue = loan.emi_amount * monthsRemaining;
                
                if (emiDue > 0) {
                    liabilities.push({
                        liability_type: 'emi',
                        liability_name: `Loan EMI: ${loan.lender_name}`,
                        source_type: 'loan',
                        source_id: loan.id,
                        amount_due_next_12_months: emiDue,
                        is_included: true,
                        notes: `${monthsRemaining} EMIs of ₹${loan.emi_amount}`,
                    });
                }
            }
        }
    }

    return liabilities;
}

/**
 * Calculate Zakat for a given snapshot date
 * This is the main calculation function - pure and deterministic
 */
export async function calculateZakat(
    profileId: string,
    snapshotDate: string,
    assetItems?: ZakatAssetItem[],
    liabilityItems?: ZakatLiabilityItem[]
): Promise<{
    snapshot: ZakatSnapshot;
    assetItems: ZakatAssetItem[];
    liabilityItems: ZakatLiabilityItem[];
}> {
    const supabase = createClient();

    // Get settings
    const settings = await getZakatSettings(profileId);
    if (!settings) {
        throw new Error('Zakat settings not found. Please configure your Zakat settings first.');
    }

    // Get profile for household_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('id', profileId)
        .single();

    if (!profile) throw new Error('Profile not found');

    // Calculate Zakat year
    const zakatYear = calculateZakatYear(settings.anniversary_date, snapshotDate);

    // Gather assets and liabilities if not provided
    let assets: Omit<ZakatAssetItem, 'id' | 'snapshot_id' | 'created_at'>[];
    let liabilities: Omit<ZakatLiabilityItem, 'id' | 'snapshot_id' | 'created_at'>[];

    if (assetItems && liabilityItems) {
        // Use provided items (for snapshot retrieval)
        assets = assetItems.map(a => ({
            asset_type: a.asset_type,
            asset_name: a.asset_name,
            source_type: a.source_type,
            source_id: a.source_id,
            market_value: a.market_value,
            is_included: a.is_included,
            notes: a.notes,
        }));
        liabilities = liabilityItems.map(l => ({
            liability_type: l.liability_type,
            liability_name: l.liability_name,
            source_type: l.source_type,
            source_id: l.source_id,
            amount_due_next_12_months: l.amount_due_next_12_months,
            is_included: l.is_included,
            notes: l.notes,
        }));
    } else {
        // Gather fresh data
        assets = await gatherZakatableAssets(profileId, profile.household_id, snapshotDate);
        liabilities = await gatherDeductibleLiabilities(profileId, profile.household_id, snapshotDate);
    }

    // Get gold/silver prices for Nisab calculation
    const prices = await getGoldSilverPrices(snapshotDate);
    const goldPriceINR = prices.gold_price_per_gram_usd * prices.exchange_rate_usd_to_inr;
    const silverPriceINR = prices.silver_price_per_gram_usd * prices.exchange_rate_usd_to_inr;

    // Calculate Nisab threshold
    const nisabThreshold = calculateNisabThreshold(
        settings.nisab_type,
        goldPriceINR,
        silverPriceINR
    );

    // Calculate totals (only included items)
    const totalZakatableAssets = assets
        .filter(a => a.is_included)
        .reduce((sum, a) => sum + a.market_value, 0);

    const totalDeductibleLiabilities = liabilities
        .filter(l => l.is_included)
        .reduce((sum, l) => sum + l.amount_due_next_12_months, 0);

    const netZakatableWealth = totalZakatableAssets - totalDeductibleLiabilities;

    // Calculate Zakat due
    const zakatDue = netZakatableWealth >= nisabThreshold
        ? netZakatableWealth * ZAKAT_RATE
        : 0;

    // Create snapshot
    const snapshot: Omit<ZakatSnapshot, 'id' | 'created_at' | 'asset_items' | 'liability_items'> = {
        profile_id: profileId,
        snapshot_date: snapshotDate,
        zakat_year_start: zakatYear.start,
        zakat_year_end: zakatYear.end,
        total_zakatable_assets: totalZakatableAssets,
        total_deductible_liabilities: totalDeductibleLiabilities,
        net_zakatable_wealth: netZakatableWealth,
        nisab_threshold: nisabThreshold,
        nisab_type: settings.nisab_type,
        zakat_due: zakatDue,
    };

    return {
        snapshot: snapshot as ZakatSnapshot,
        assetItems: assets as ZakatAssetItem[],
        liabilityItems: liabilities as ZakatLiabilityItem[],
    };
}

/**
 * Create a Zakat snapshot using RPC function
 */
export async function createZakatSnapshot(
    profileId: string,
    snapshotDate: string
): Promise<ZakatSnapshot> {
    const supabase = createClient();

    // Calculate Zakat
    const { snapshot, assetItems, liabilityItems } = await calculateZakat(
        profileId, 
        snapshotDate, 
        undefined, 
        undefined
    );

    // Prepare assets and liabilities for RPC
    const assetsForRPC = assetItems.map(a => ({
        asset_type: a.asset_type,
        asset_name: a.asset_name,
        source_type: a.source_type,
        source_id: a.source_id,
        market_value: a.market_value.toString(),
        is_included: a.is_included,
        notes: a.notes,
    }));

    const liabilitiesForRPC = liabilityItems.map(l => ({
        liability_type: l.liability_type,
        liability_name: l.liability_name,
        source_type: l.source_type,
        source_id: l.source_id,
        amount_due_next_12_months: l.amount_due_next_12_months.toString(),
        is_included: l.is_included,
        notes: l.notes,
    }));

    // Create snapshot using RPC function
    const { data: snapshotId, error: snapshotError } = await supabase.rpc(
        'create_zakat_snapshot_with_items',
        {
            p_snapshot_date: snapshot.snapshot_date,
            p_zakat_year_start: snapshot.zakat_year_start,
            p_zakat_year_end: snapshot.zakat_year_end,
            p_nisab_threshold: snapshot.nisab_threshold,
            p_nisab_type: snapshot.nisab_type,
            p_total_zakatable_assets: snapshot.total_zakatable_assets,
            p_total_deductible_liabilities: snapshot.total_deductible_liabilities,
            p_net_zakatable_wealth: snapshot.net_zakatable_wealth,
            p_zakat_due: snapshot.zakat_due,
            p_assets: assetsForRPC,
            p_liabilities: liabilitiesForRPC,
        }
    );

    if (snapshotError) throw snapshotError;

    // Fetch complete snapshot with items
    const fullSnapshot = await getZakatSnapshot(snapshotId);
    if (!fullSnapshot) {
        throw new Error('Failed to fetch created snapshot');
    }
    return fullSnapshot;
}

/**
 * Get a Zakat snapshot with items
 */
export async function getZakatSnapshot(
    snapshotId: string
): Promise<ZakatSnapshot | null> {
    const supabase = createClient();

    // First fetch the snapshot
    const { data: snapshot, error: snapshotError } = await supabase
        .from('zakat_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .maybeSingle();

    if (snapshotError) {
        console.error('Error fetching zakat snapshot:', snapshotError);
        console.error('Snapshot ID:', snapshotId);
        throw new Error(`Failed to fetch snapshot: ${snapshotError.message}`);
    }
    
    if (!snapshot) {
        console.warn('Snapshot not found:', snapshotId);
        return null;
    }

    // Then fetch related items separately to avoid RLS issues with nested queries
    const { data: assetItems, error: assetError } = await supabase
        .from('zakat_asset_items')
        .select('*')
        .eq('snapshot_id', snapshotId);

    if (assetError) {
        console.error('Error fetching asset items:', assetError);
        throw new Error(`Failed to fetch asset items: ${assetError.message}`);
    }

    const { data: liabilityItems, error: liabilityError } = await supabase
        .from('zakat_liability_items')
        .select('*')
        .eq('snapshot_id', snapshotId);

    if (liabilityError) {
        console.error('Error fetching liability items:', liabilityError);
        throw new Error(`Failed to fetch liability items: ${liabilityError.message}`);
    }

    // Return snapshot with items
    return {
        ...snapshot,
        asset_items: assetItems || [],
        liability_items: liabilityItems || [],
    };
}

/**
 * Get all Zakat snapshots for a profile
 */
export async function getZakatSnapshots(
    profileId: string
): Promise<ZakatSnapshot[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('zakat_snapshots')
        .select('*')
        .eq('profile_id', profileId)
        .order('snapshot_date', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Update asset or liability item inclusion status using RPC
 */
export async function updateZakatItemInclusion(
    itemId: string,
    itemType: 'asset' | 'liability',
    isIncluded: boolean
): Promise<void> {
    const supabase = createClient();

    if (itemType === 'asset') {
        const { error } = await supabase.rpc('update_zakat_asset_item', {
            p_asset_id: itemId,
            p_is_included: isIncluded,
        });
        if (error) throw error;
    } else {
        const { error } = await supabase.rpc('update_zakat_liability_item', {
            p_liability_id: itemId,
            p_is_included: isIncluded,
        });
        if (error) throw error;
    }

    // The RPC function automatically updates snapshot totals
}

/**
 * Delete a Zakat snapshot using RPC
 */
export async function deleteZakatSnapshot(snapshotId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase.rpc('delete_zakat_snapshot', {
        p_snapshot_id: snapshotId,
    });

    if (error) throw error;
}