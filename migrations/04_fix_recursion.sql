-- Fix infinite recursion in household_members policy
-- The previous policy selected from household_members to check permissions for household_members, causing recursion.
-- We will use the security definer function get_user_household_id() (which queries profiles) instead.

DROP POLICY IF EXISTS "View household members" ON household_members;

CREATE POLICY "View household members" ON household_members
FOR SELECT USING (
    -- Can view if the row's household_id matches the user's active household
    household_id = get_user_household_id()
    OR
    -- Or if the row belongs to the user
    profile_id = auth.uid()
);
