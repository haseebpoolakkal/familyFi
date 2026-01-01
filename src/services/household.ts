import { createClient } from '@/lib/supabase/client';

export async function getProfile(userId: string) {
    const supabaseServer = createClient();
    const { data, error } = await supabaseServer
        .from('profiles')
        .select('*, households(*)')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
    return data;
}

export async function createHousehold(name: string, fullName?: string) {
    const supabaseServer = createClient();
    const { data: householdId, error } = await supabaseServer
        .rpc('create_new_household', {
            h_name: name,
            u_name: fullName || 'New User'
        });

    if (error) throw error;

    return { id: householdId };
}

export async function joinHousehold(userId: string, householdId: string) {
    // Check if household exists
    const supabaseServer = createClient();
    const { data: household, error: hError } = await supabaseServer
        .from('households')
        .select('id')
        .eq('id', householdId)
        .maybeSingle();

    if (hError || !household) {
        throw new Error('Invalid Household ID. Please check and try again.');
    }

    const { error } = await supabaseServer
        .from('profiles')
        .upsert({
            id: userId,
            household_id: householdId,
            role: 'member'
        });

    if (error) throw error;
}
