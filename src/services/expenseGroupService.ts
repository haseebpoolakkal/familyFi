import { createClient } from '@/lib/supabase/client';
import { Visibility } from '@/types';
import { shareRecord } from './sharing';

/**
 * Expense Group
 */
export interface ExpenseGroup {
    id: string;
    household_id: string;
    name: string;
    description: string | null;
    start_date: string;
    owner_profile_id: string;
    visibility: Visibility;
    created_at: string;
    total_amount?: number;
}

/**
 * Expense Group Member
 */
export interface ExpenseGroupMember {
    id: string;
    expense_group_id: string;
    profile_id: string;
    role: 'owner' | 'member';
    joined_at: string;
}

/**
 * Expense inside a Group
 */
export interface ExpenseGroupExpense {
    id: string;
    expense_group_id: string;
    amount: number;
    description: string;
    category_id: string | null;
    paid_by_profile_id: string;
    expense_date: string;
    created_at: string;
    category?: {
        id: string;
        name: string;
    };
}

/**
 * Get all expense groups for a household
 */
export async function getExpenseGroups(): Promise<ExpenseGroup[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('expense_groups')
        .select(`
      *,
      expense_group_items(amount)
    `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching expense groups:', error);
        throw error;
    }

    return (data || []).map(g => ({
        ...g,
        total_amount:
            g.expense_group_items?.reduce(
                (sum: number, item: { amount: number }) => sum + (item.amount || 0),
                0
            ) || 0,
        expense_group_items: g.expense_group_items
    }));
}

/**
 * Get a single expense group
 */
export async function getExpenseGroupById(groupId: string): Promise<ExpenseGroup> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('expense_groups')
        .select('*')
        .eq('id', groupId)
        .single();

    if (error) {
        console.error('Error fetching expense group:', error);
        throw error;
    }

    return data;
}

/**
 * Create an expense group
 */
export async function createExpenseGroup(
    householdId: string,
    name: string,
    description?: string,
    startDate?: string,
    visibility: Visibility = 'household',
    sharedWith: string[] = []
): Promise<ExpenseGroup> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .rpc('create_expense_group', {
            p_household_id: householdId,
            p_name: name,
            p_description: description ?? null,
            p_start_date: startDate ?? null,
            p_visibility: visibility
        });

    if (error) {
        console.error('Error creating expense group:', error);
        throw error;
    }

    if (visibility === 'custom' && sharedWith.length) {
        await shareRecord('expense_groups', data.id, sharedWith);
    }

    return data;
}

/**
 * Update expense group
 */
export async function updateExpenseGroup(
    groupId: string,
    updates: Partial<Pick<ExpenseGroup, 'name' | 'description' | 'start_date' | 'visibility'>>
): Promise<ExpenseGroup> {
    const supabase = createClient();

    const { data, error } = await supabase
        .rpc('update_expense_group', {
            p_group_id: groupId,
            p_name: updates.name ?? null,
            p_description: updates.description ?? null,
            p_start_date: updates.start_date ?? null,
            p_visibility: updates.visibility ?? null
        });

    if (error) {
        console.error('Error updating expense group:', error);
        throw error;
    }

    return data;
}

/**
 * Delete expense group (cascade deletes expenses & members)
 */
export async function deleteExpenseGroup(groupId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .rpc('delete_expense_group', {
            p_group_id: groupId
        });

    if (error) {
        console.error('Error deleting expense group:', error);
        throw error;
    }
}

/**
 * Get members of an expense group
 */
export async function getExpenseGroupMembers(groupId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('expense_group_members')
        .select(`
            *,
            profile:profiles(id, full_name)
        `)
        .eq('expense_group_id', groupId);

    if (error) {
        console.error('Error fetching expense group members:', error);
        throw error;
    }

    return (data || []).map(m => ({
        ...m,
        name: m.profile?.full_name || 'Unknown'
    }));
}

/**
 * Add member to expense group
 */
export async function addExpenseGroupMember(
    groupId: string,
    profileId: string
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .rpc('add_expense_group_member', {
            p_group_id: groupId,
            p_profile_id: profileId
        });

    if (error) {
        console.error('Error adding expense group member:', error);
        throw error;
    }
}

/**
 * Remove member from expense group
 */
export async function removeExpenseGroupMember(
    groupId: string,
    profileId: string
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .rpc('remove_expense_group_member', {
            p_group_id: groupId,
            p_profile_id: profileId
        });

    if (error) {
        console.error('Error removing expense group member:', error);
        throw error;
    }
}

/**
 * Get expenses of a group
 */
export async function getExpenseGroupExpenses(
    groupId: string
): Promise<ExpenseGroupExpense[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('expense_group_items')
        .select(`
      id,
      expense_group_id,
      household_id,
      profile_id,
      amount,
      description,
      expense_date,
      source_type,
      source_id,
      created_at
    `)
        .eq('expense_group_id', groupId)
        .order('expense_date', { ascending: false })
        .returns<ExpenseGroupExpense[]>(); // ✅ FIX

    if (error) {
        console.error('Error fetching expense group expenses:', error);
        throw error;
    }

    return data ?? [];
}



/**
 * Add expense to group
 */
export async function addExpenseToGroup(
    groupId: string,
    amount: number,
    description: string,
    categoryId?: string,
    expenseDate?: string
): Promise<ExpenseGroupExpense> {
    const supabase = createClient();

    const { data, error } = await supabase
        .rpc('add_expense_group_expense', {
            p_group_id: groupId,
            p_amount: amount,
            p_description: description,
            p_category_id: categoryId ?? null,
            p_expense_date: expenseDate ?? new Date().toISOString()
        });

    if (error) {
        console.error('Error adding group expense:', error);
        throw error;
    }

    return data;
}

/**
 * Update group expense
 */
export async function updateGroupExpense(
    expenseId: string,
    updates: Partial<Pick<ExpenseGroupExpense, 'amount' | 'description' | 'category_id' | 'expense_date'>>
): Promise<ExpenseGroupExpense> {
    const supabase = createClient();

    const { data, error } = await supabase
        .rpc('update_expense_group_expense', {
            p_expense_id: expenseId,
            p_amount: updates.amount ?? null,
            p_description: updates.description ?? null,
            p_category_id: updates.category_id ?? null,
            p_expense_date: updates.expense_date ?? null
        });

    if (error) {
        console.error('Error updating group expense:', error);
        throw error;
    }

    return data;
}

/**
 * Delete expense from group
 */
export async function deleteGroupExpense(expenseId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .rpc('delete_expense_group_expense', {
            p_expense_id: expenseId
        });

    if (error) {
        console.error('Error deleting group expense:', error);
        throw error;
    }
}
export async function createExpenseGroupWithDetails(payload: {
    name: string;
    description?: string;
    startDate?: string;
    members?: { profile_id: string; role?: string }[];
}) {
    const supabase = createClient();

    // Call the new RPC function
    const { data: groupId, error } = await supabase.rpc(
        'create_expense_group_with_members',
        {
            p_name: payload.name,
            p_description: payload.description ?? null,
            p_start_date: payload.startDate ?? new Date().toISOString().split('T')[0],
            p_members: JSON.stringify(payload.members || [])
        }
    );

    if (error) {
        console.error('Error in create_expense_group_with_members:', error);
        throw error;
    }

    return groupId;
}

export async function createExpenseGroupItem(payload: {
    expense_group_id: string;
    amount: number;
    description: string;
    paid_by_profile_id: string;
    expense_date?: string;
    splits?: { profile_id: string; amount: number }[];
    category_id?: string;
}) {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('add_expense_group_item', {
        p_group_id: payload.expense_group_id,
        p_amount: payload.amount,
        p_description: payload.description,
        p_paid_by_profile_id: payload.paid_by_profile_id,
        p_expense_date: payload.expense_date ?? new Date().toISOString().split('T')[0],
        p_splits: payload.splits || [],
        p_category_id: payload.category_id ?? null
    });

    if (error) {
        console.error('Error in create_expense_group_item:', error);
        throw error;
    }

    return data;
}
