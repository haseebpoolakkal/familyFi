import { createClient } from '@/lib/supabase/client';

/**
 * Expense Template - Defines the rule for an expense (fixed or variable)
 */
export interface ExpenseTemplate {
    id: string;
    household_id: string;
    category_id: string | null;
    name: string;
    default_amount: number;
    is_fixed: boolean;
    recurrence: 'monthly' | 'quarterly' | 'yearly' | null;
    due_day: number | null;
    created_at: string;
    category?: {
        id: string;
        name: string;
    };
    status?: 'paid' | 'due' | 'overdue';
    currentMonthPayment?: ExpensePayment | null;
}

/**
 * Expense Payment - Individual payment instance
 */
export interface ExpensePayment {
    id: string;
    expense_template_id: string;
    due_date: string;
    amount: number;
    is_paid: boolean;
    paid_at: string | null;
    created_at: string;
}

/**
 * Combined view for UI
 */
export interface ExpenseWithPayments extends ExpenseTemplate {
    payments: ExpensePayment[];
    nextDueDate?: string;
}

/**
 * Get all expense templates for a household
 */
export async function getExpenseTemplates(householdId: string): Promise<ExpenseTemplate[]> {
    const supabase = createClient();

    // Fetch templates
    const { data: templates, error } = await supabase
        .from('expense_templates')
        .select('*, category:expense_categories(*)')
        .eq('household_id', householdId)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching expense templates:', error);
        throw error;
    }

    if (!templates || templates.length === 0) return [];

    // Fetch this month's payments to determine status
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data: payments, error: pError } = await supabase
        .from('expense_payments')
        .select('*')
        .in('expense_template_id', templates.map(t => t.id))
        .gte('due_date', startOfMonth)
        .lte('due_date', endOfMonth);

    if (pError) {
        console.error('Error fetching current month payments:', pError);
        // Continue without statuses if payments fetch fails
        return templates;
    }

    // Map statuses to templates
    return templates.map(template => {
        const payment = payments?.find(p => p.expense_template_id === template.id);
        const status = calculateExpenseStatus(template.due_day, !!payment?.is_paid);

        return {
            ...template,
            status,
            currentMonthPayment: payment || null
        };
    });
}

/**
 * Helper to calculate status based on due day and payment status
 */
export function calculateExpenseStatus(
    dueDay: number | null,
    isPaid: boolean
): 'paid' | 'due' | 'overdue' {
    if (isPaid) return 'paid';
    if (!dueDay) return 'due';

    const today = new Date();
    const currentDay = today.getDate();

    if (currentDay > dueDay) return 'overdue';
    return 'due';
}

/**
 * Check if a payment exists for a given template in a specific month/period
 */
export async function checkPaymentExists(templateId: string, dateStr: string): Promise<boolean> {
    const supabase = createClient();
    const date = new Date(dateStr);
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabase
        .from('expense_payments')
        .select('id')
        .eq('expense_template_id', templateId)
        .gte('due_date', startOfMonth)
        .lte('due_date', endOfMonth)
        .maybeSingle();

    if (error) {
        console.error('Error checking payment existence:', error);
        return false;
    }

    return !!data;
}

/**
 * Get all payments for a specific expense template
 */
export async function getExpensePayments(templateId: string): Promise<ExpensePayment[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('expense_payments')
        .select('*')
        .eq('expense_template_id', templateId)
        .order('due_date', { ascending: false });

    if (error) {
        console.error('Error fetching expense payments:', error);
        throw error;
    }

    return data || [];
}

/**
 * Create a fixed recurring expense template
 */
export async function createFixedExpenseTemplate(
    householdId: string,
    name: string,
    defaultAmount: number,
    categoryId: string,
    recurrence: 'monthly' | 'quarterly' | 'yearly',
    dueDay: number
): Promise<ExpenseTemplate> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('expense_templates')
        .insert([{
            household_id: householdId,
            category_id: categoryId,
            name,
            default_amount: defaultAmount,
            is_fixed: true,
            recurrence,
            due_day: dueDay,
        }])
        .select('*, category:expense_categories(*)')
        .single();

    if (error) {
        console.error('Error creating fixed expense template:', error);
        throw error;
    }

    return data;
}

/**
 * Create or get a variable expense template and add a payment
 */
export async function createVariableExpense(
    householdId: string,
    name: string,
    amount: number,
    categoryId: string,
    dueDate: string,
    isPaid: boolean = true
): Promise<{ template: ExpenseTemplate; payment: ExpensePayment }> {
    const supabase = createClient();

    // Check if a template with this name already exists for this household and is NOT fixed
    const { data: existingTemplate } = await supabase
        .from('expense_templates')
        .select('*')
        .eq('household_id', householdId)
        .eq('name', name)
        .eq('is_fixed', false)
        .maybeSingle();

    let template: ExpenseTemplate;

    if (existingTemplate) {
        template = existingTemplate;
    } else {
        // Create new template
        const { data: newTemplate, error: templateError } = await supabase
            .from('expense_templates')
            .insert([{
                household_id: householdId,
                category_id: categoryId,
                name,
                default_amount: amount,
                is_fixed: false,
                recurrence: null,
                due_day: null,
            }])
            .select('*, category:expense_categories(*)')
            .single();

        if (templateError) {
            console.error('Error creating variable expense template:', templateError);
            throw templateError;
        }
        template = newTemplate;
    }

    // Create payment
    const { data: payment, error: paymentError } = await supabase
        .from('expense_payments')
        .insert([{
            expense_template_id: template.id,
            due_date: dueDate,
            amount,
            is_paid: isPaid,
            paid_at: isPaid ? new Date().toISOString() : null,
        }])
        .select()
        .single();

    if (paymentError) {
        console.error('Error creating expense payment:', paymentError);
        throw paymentError;
    }

    return { template, payment };
}

/**
 * Get all variable expenses (payments) for a household in the current month
 * Grouped or as a list
 */
export async function getVariableExpenses(householdId: string): Promise<Array<ExpensePayment & { template: ExpenseTemplate }>> {
    const supabase = createClient();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabase
        .from('expense_payments')
        .select(`
            *,
            template:expense_templates!inner(
                *,
                category:expense_categories(*)
            )
        `)
        .eq('template.household_id', householdId)
        .eq('template.is_fixed', false)
        .gte('due_date', startOfMonth)
        .lte('due_date', endOfMonth)
        .order('due_date', { ascending: false });

    if (error) {
        console.error('Error fetching variable expenses:', error);
        throw error;
    }

    return data as (ExpensePayment & { template: ExpenseTemplate })[];
}

/**
 * Create a payment for an expense template
 */
export async function createPayment(
    templateId: string,
    amount: number,
    dueDate: string,
    isPaid: boolean = true
): Promise<ExpensePayment> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('expense_payments')
        .insert([{
            expense_template_id: templateId,
            due_date: dueDate,
            amount,
            is_paid: isPaid,
            paid_at: isPaid ? new Date().toISOString() : null,
        }])
        .select()
        .single();

    if (error) {
        console.error('Error creating payment:', error);
        throw error;
    }

    return data;
}

/**
 * Update payment status (mark as paid/unpaid)
 */
export async function updatePaymentStatus(
    paymentId: string,
    isPaid: boolean
): Promise<ExpensePayment> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('expense_payments')
        .update({
            is_paid: isPaid,
            paid_at: isPaid ? new Date().toISOString() : null,
        })
        .eq('id', paymentId)
        .select()
        .single();

    if (error) {
        console.error('Error updating payment status:', error);
        throw error;
    }

    return data;
}

/**
 * Calculate next due date for a fixed expense
 */
export function calculateNextDueDate(
    recurrence: 'monthly' | 'quarterly' | 'yearly',
    dueDay: number
): string {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    const nextDate = new Date(currentYear, currentMonth, dueDay);

    // If due day has passed this month, move to next cycle
    if (currentDay >= dueDay) {
        if (recurrence === 'monthly') {
            nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (recurrence === 'quarterly') {
            nextDate.setMonth(nextDate.getMonth() + 3);
        } else if (recurrence === 'yearly') {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
        }
    }

    return nextDate.toISOString().split('T')[0];
}

/**
 * Check if a specific date is overdue
 * Note: For recurring templates, we usually check against the due_day of current month
 */
export function isPaymentOverdue(dateStr: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    return today > date;
}

/**
 * Get all expenses (payments) for a household in the current month
 * This is primarily for the dashboard and backward compatibility
 */
export async function getExpenses(householdId: string): Promise<Array<{
    id: string;
    amount: number;
    description: string;
    category: { name: string } | null;
    due_date: string;
    is_paid: boolean;
}>> {
    const supabase = createClient();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabase
        .from('expense_payments')
        .select(`
            id,
            amount,
            due_date,
            is_paid,
            template:expense_templates!inner(
                name,
                category:expense_categories(name)
            )
        `)
        .eq('template.household_id', householdId)
        .gte('due_date', startOfMonth)
        .lte('due_date', endOfMonth);

    if (error) {
        console.error('Error fetching dashboard expenses:', error);
        throw error;
    }

    // Map to the structure expected by the dashboard
    return (data || []).map(payment => {
        const template = payment.template as unknown as { name: string; category: { name: string } | null };
        return {
            id: payment.id,
            amount: payment.amount,
            description: template.name,
            category: template.category,
            due_date: payment.due_date,
            is_paid: payment.is_paid
        };
    });
}

/**
 * Delete an expense template and all its payments
 */
export async function deleteExpenseTemplate(templateId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from('expense_templates')
        .delete()
        .eq('id', templateId);

    if (error) {
        console.error('Error deleting expense template:', error);
        throw error;
    }
}

/**
 * Update an existing expense template
 */
export async function updateExpenseTemplate(
    id: string,
    updates: Partial<ExpenseTemplate>
): Promise<ExpenseTemplate> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('expense_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating expense template:', error);
        throw error;
    }

    return data;
}

/**
 * Update a specific payment
 */
export async function updatePayment(
    paymentId: string,
    updates: Partial<ExpensePayment>
): Promise<ExpensePayment> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('expense_payments')
        .update(updates)
        .eq('id', paymentId)
        .select()
        .single();

    if (error) {
        console.error('Error updating payment:', error);
        throw error;
    }

    return data;
}

/**
 * Delete a specific payment
 */
export async function deletePayment(paymentId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from('expense_payments')
        .delete()
        .eq('id', paymentId);

    if (error) {
        console.error('Error deleting payment:', error);
        throw error;
    }
}
