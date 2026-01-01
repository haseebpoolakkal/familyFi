import { createClient } from '@/lib/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

/**
 * Automated expense payment generation based on templates
 * This replaces the legacy cloning logic.
 */
export async function ensureMonthlyExpenses(householdId: string) {
    const supabase = createClient();
    const now = new Date();
    const monthStart = startOfMonth(now).toISOString();
    const monthEnd = endOfMonth(now).toISOString();

    // 1. Fetch all fixed templates for the household
    const { data: templates, error: templateError } = await supabase
        .from('expense_templates')
        .select('*')
        .eq('household_id', householdId)
        .eq('is_fixed', true);

    if (templateError) throw templateError;
    if (!templates || templates.length === 0) return false;

    let createdCount = 0;

    for (const template of templates) {
        // 2. Check if a payment already exists for this template in the current month
        const { data: existing, error: checkError } = await supabase
            .from('expense_payments')
            .select('id')
            .eq('expense_template_id', template.id)
            .gte('due_date', monthStart)
            .lte('due_date', monthEnd)
            .limit(1);

        if (checkError) throw checkError;

        // 3. If no payment exists, create one
        if (!existing || existing.length === 0) {
            const dueDay = template.due_day || 1;
            const dueDate = format(new Date(now.getFullYear(), now.getMonth(), dueDay), 'yyyy-MM-dd');

            const { error: insertError } = await supabase
                .from('expense_payments')
                .insert([{
                    expense_template_id: template.id,
                    due_date: dueDate,
                    amount: template.default_amount,
                    is_paid: false
                }]);

            if (insertError) {
                console.error(`Failed to generate payment for template ${template.id}:`, insertError);
            } else {
                createdCount++;
            }
        }
    }

    return createdCount > 0;
}
