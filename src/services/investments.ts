import { createClient } from '@/lib/supabase/client';
import {
    InvestmentInstrument,
    InvestmentPlan,
    InvestmentTransaction,
    InvestmentType,
    Visibility,
    InvestmentFrequency
} from '@/types';
import { shareRecord } from './sharing';

export type CreateInstrumentInput = {
    name: string;
    type: InvestmentType;
    isin_or_symbol?: string;
    risk_level?: 'low' | 'medium' | 'high';
};

export async function createInvestmentInstrument(input: CreateInstrumentInput): Promise<InvestmentInstrument> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('investment_instruments')
        .insert([input])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getInvestmentInstruments(): Promise<InvestmentInstrument[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('investment_instruments')
        .select('*')
        .order('name');

    if (error) throw error;
    return data || [];
}

export type CreatePlanInput = {
    household_id: string;
    instrument_id: string;
    goal_id?: string;
    amount: number;
    frequency: InvestmentFrequency;
    start_date: string;
    visibility?: Visibility;
    sharedWith?: string[];
};

export async function createInvestmentPlan(input: CreatePlanInput): Promise<InvestmentPlan> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const visibility = input.visibility || 'private';

    const { data, error } = await supabase
        .from('investment_plans')
        .insert([{
            household_id: input.household_id,
            owner_profile_id: user.id,
            instrument_id: input.instrument_id,
            goal_id: input.goal_id,
            amount: input.amount,
            frequency: input.frequency,
            start_date: input.start_date,
            status: 'active',
            visibility: visibility
        }])
        .select('*, instrument:investment_instruments(*)')
        .single();

    if (error) throw error;

    if (visibility === 'custom' && input.sharedWith?.length && data) {
        await shareRecord('investment_plans', data.id, input.sharedWith);
    }

    return data;
}

export async function getInvestmentPlans(householdId: string): Promise<InvestmentPlan[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('investment_plans')
        .select(`
            *,
            instrument:investment_instruments(*)
        `)
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export type CreateTransactionInput = {
    plan_id: string;
    transaction_date: string;
    amount: number;
    transaction_type: 'buy' | 'sell' | 'dividend';
    units?: number;
    nav?: number;
};

export async function recordInvestmentTransaction(input: CreateTransactionInput): Promise<InvestmentTransaction> {
    const supabase = createClient();

    // Validate access implicitly via RLS
    const { data, error } = await supabase
        .from('investment_transactions')
        .insert([input])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getInvestmentTransactions(planId: string): Promise<InvestmentTransaction[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('investment_transactions')
        .select('*')
        .eq('plan_id', planId)
        .order('transaction_date', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function pauseInvestmentPlan(planId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from('investment_plans')
        .update({ status: 'paused' })
        .eq('id', planId);

    if (error) throw error;
}

export async function resumeInvestmentPlan(planId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from('investment_plans')
        .update({ status: 'active' })
        .eq('id', planId);

    if (error) throw error;
}

export async function updateInvestmentPlan(
    planId: string,
    updates: Partial<Omit<CreatePlanInput, 'household_id' | 'instrument_id'>> & { sharedWith?: string[] }
): Promise<InvestmentPlan> {
    const supabase = createClient();
    const { sharedWith, ...updateData } = updates;

    const { data, error } = await supabase
        .from('investment_plans')
        .update(updateData)
        .eq('id', planId)
        .select('*, instrument:investment_instruments(*)')
        .single();

    if (error) throw error;

    // Update sharing if visibility changed to custom
    if (updateData.visibility === 'custom' && sharedWith?.length && data) {
        // Remove existing shares
        await supabase
            .from('record_shares')
            .delete()
            .eq('table_name', 'investment_plans')
            .eq('record_id', planId);

        // Add new shares
        await shareRecord('investment_plans', planId, sharedWith);
    } else if (updateData.visibility !== 'custom' && data) {
        // Remove shares if visibility is no longer custom
        await supabase
            .from('record_shares')
            .delete()
            .eq('table_name', 'investment_plans')
            .eq('record_id', planId);
    }

    return data;
}

export async function deleteInvestmentPlan(planId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from('investment_plans')
        .delete()
        .eq('id', planId);

    if (error) throw error;
}

export async function deleteInvestmentTransaction(transactionId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from('investment_transactions')
        .delete()
        .eq('id', transactionId);

    if (error) throw error;
}
