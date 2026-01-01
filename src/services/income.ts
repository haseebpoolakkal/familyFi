import { createClient } from "@/lib/supabase/client";

export interface Income {
    id: string;
    household_id: string;
    profile_id: string;
    amount: number;
    description: string;
    type: 'fixed' | 'freelance';
    date: string;
}

export async function getIncome(householdId: string): Promise<Income[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('income')
        .select('*')
        .eq('household_id', householdId)
        .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function addIncome(income: Partial<Income>) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('income')
        .insert([income])
        .select()
        .maybeSingle();

    if (error) throw error;
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
