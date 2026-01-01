import { createClient } from '@/lib/supabase/client';

/**
 * Expense Category Types
 */
export interface ExpenseCategory {
    id: string;
    name: string;
    household_id: string;
    created_at?: string;
}

/**
 * Get all expense categories for a household
 */
export async function getExpenseCategories(householdId: string): Promise<ExpenseCategory[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('household_id', householdId)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching expense categories:', error);
        throw error;
    }

    return data || [];
}

/**
 * Create a new expense category
 */
export async function createExpenseCategory(
    householdId: string,
    name: string
): Promise<ExpenseCategory> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('expense_categories')
        .insert([{ name, household_id: householdId }])
        .select()
        .single();

    if (error) {
        console.error('Error creating expense category:', error);
        throw error;
    }

    return data;
}

/**
 * Delete an expense category
 */
export async function deleteExpenseCategory(categoryId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', categoryId);

    if (error) {
        console.error('Error deleting expense category:', error);
        throw error;
    }
}

/**
 * Update an expense category name
 */
export async function updateExpenseCategory(
    categoryId: string,
    name: string
): Promise<ExpenseCategory> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('expense_categories')
        .update({ name })
        .eq('id', categoryId)
        .select()
        .single();

    if (error) {
        console.error('Error updating expense category:', error);
        throw error;
    }

    return data;
}
