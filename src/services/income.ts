import { createClient } from "@/lib/supabase/client";
import { Visibility } from "@/types";
import { shareRecord } from "./sharing";

export interface Income {
    id: string;
    household_id: string;
    profile_id: string;
    amount: number;
    description: string;
    type: 'fixed' | 'freelance';
    date: string;
    owner_profile_id: string;
    visibility: Visibility;
}

export async function getIncome(householdId: string, startDate?: string, endDate?: string): Promise<Income[]> {
    const supabase = createClient();
    let query = supabase
        .from('income')
        // TODO: ideally fetch shared_with if needed
        .select('*')
        .eq('household_id', householdId);

    if (startDate) {
        query = query.gte('date', startDate);
    }
    if (endDate) {
        query = query.lte('date', endDate);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;
    // @ts-ignore - Supabase types might not match perfectly yet without codegen
    return data || [];
}

export type CreateIncomeInput = Partial<Income> & { sharedWith?: string[] };

export async function addIncome(income: CreateIncomeInput) {
    const supabase = createClient();
    const { sharedWith, ...incomeData } = income;

    // Ensure visibility defaults
    if (!incomeData.visibility) incomeData.visibility = 'private'; // Requirement says Income Default -> Private

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('income')
        .insert([{
            ...incomeData,
            owner_profile_id: user.id
        }])
        .select()
        .maybeSingle();

    if (error) throw error;

    if (incomeData.visibility === 'custom' && sharedWith?.length && data) {
        await shareRecord('income', data.id, sharedWith);
    }

    return data;
}

export async function updateIncome(id: string, updates: Partial<Income>) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('income')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function deleteIncome(id: string) {
    const supabase = createClient();
    const { error } = await supabase
        .from('income')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
