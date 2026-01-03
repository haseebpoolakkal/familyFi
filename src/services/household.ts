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
    const supabaseServer = createClient();

    const { error } = await supabaseServer
        .rpc('join_existing_household', {
            p_household_id: householdId
        });

    if (error) {
        if (error.message.includes('Invalid Household ID')) {
            throw new Error('Invalid Household ID. Please check and try again.');
        }
        throw error;
    }
}

export async function getHouseholdMembers(householdId: string) {
    const supabaseServer = createClient();
    const { data, error } = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('household_id', householdId);

    if (error) {
        console.error('Error fetching household members:', error);
        return [];
    }
    return data;
}
