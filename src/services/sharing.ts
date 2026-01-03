import { createClient } from "@/lib/supabase/client";

export async function shareRecord(
    tableName: 'income' | 'expense_templates' | 'goals' | 'loans',
    recordId: string,
    profileIds: string[]
) {
    if (!profileIds.length) return;

    const supabase = createClient();
    const shares = profileIds.map(profileId => ({
        table_name: tableName,
        record_id: recordId,
        profile_id: profileId
    }));

    const { error } = await supabase
        .from('record_shares')
        .insert(shares);

    if (error) {
        console.error(`Error sharing ${tableName} record:`, error);
        throw error;
    }
}

export async function getSharedProfileIds(
    tableName: 'income' | 'expense_templates' | 'goals' | 'loans',
    recordId: string
): Promise<string[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('record_shares')
        .select('profile_id')
        .eq('table_name', tableName)
        .eq('record_id', recordId);

    if (error) {
        console.error(`Error fetching shares for ${tableName}:`, error);
        return [];
    }

    return data.map(d => d.profile_id);
}
