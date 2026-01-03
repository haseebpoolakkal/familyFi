-- Fix Profiles RLS to allow viewing household members
-- Currently, users can only see their own profile.
-- We need to allow users to see other profiles that are in the same household.

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

CREATE POLICY "View household profiles" ON profiles
FOR SELECT USING (
    -- Can view if own profile
    id = auth.uid()
    OR
    -- Can view if in the same household
    household_id = get_user_household_id()
);
