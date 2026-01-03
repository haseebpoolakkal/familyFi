-- RPC for joining a household
-- This avoids RLS issues when checking if a household exists, and ensures consistency between profiles and household_members.

CREATE OR REPLACE FUNCTION join_existing_household(p_household_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_exists BOOLEAN;
BEGIN
    -- 1. Check if user is authenticated
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Check if household exists
    SELECT EXISTS (SELECT 1 FROM households WHERE id = p_household_id) INTO v_exists;
    IF NOT v_exists THEN
        RAISE EXCEPTION 'Invalid Household ID';
    END IF;

    -- 3. Update Profile
    UPDATE profiles 
    SET household_id = p_household_id, role = 'member'
    WHERE id = v_uid;

    -- 4. Add to household_members (if not exists)
    INSERT INTO household_members (household_id, profile_id, role)
    VALUES (p_household_id, v_uid, 'member')
    ON CONFLICT (household_id, profile_id) DO NOTHING;

END;
$$;

GRANT EXECUTE ON FUNCTION join_existing_household(UUID) TO authenticated;
