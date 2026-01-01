import { createClient } from '@/lib/supabase/client';

export interface Goal {
    id: string;
    household_id: string;
    name: string;
    target_amount: number;
    saved_amount: number;
    allocation_percentage: number;
    priority: number;
    deadline?: string;
    created_at?: string;
}

export async function getGoals(householdId: string): Promise<Goal[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('household_id', householdId)
        .order('priority', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function createGoal(goal: Omit<Goal, 'id' | 'created_at' | 'saved_amount'>): Promise<Goal> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('goals')
        .insert([{ ...goal, saved_amount: 0 }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function distributeSavings(householdId: string, totalAmount: number) {
    const supabase = createClient();
    const goals = await getGoals(householdId);
    const totalPercentage = goals.reduce((acc, goal) => acc + (goal.allocation_percentage || 0), 0);

    if (totalPercentage === 0) return;

    const updates = goals.map((goal) => {
        const share = (totalAmount * (goal.allocation_percentage || 0)) / 100;
        return supabase
            .from('goals')
            .update({ saved_amount: (goal.saved_amount || 0) + share })
            .eq('id', goal.id);
    });

    const results = await Promise.all(updates);
    const errors = results.filter((r) => r.error).map((r) => r.error);

    if (errors.length > 0) throw new Error('Some goal updates failed');

    // Record distributions
    const distributions = goals.map((goal) => ({
        goal_id: goal.id,
        amount: (totalAmount * (goal.allocation_percentage || 0)) / 100,
    }));

    const { error: dError } = await supabase.from('goal_distributions').insert(distributions);
    if (dError) throw dError;
}

export async function updateGoal(
    goalId: string,
    updates: Partial<Omit<Goal, 'id' | 'household_id' | 'created_at'>>
): Promise<Goal | null> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', goalId)
        .select()
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function deleteGoal(goalId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

    if (error) throw error;
}
