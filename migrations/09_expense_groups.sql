-- ============================================
-- EXPENSE GROUP FEATURE
-- Purpose: Group multiple expenses/payments under a real-world scenario
-- ============================================

-- 1. EXPENSE GROUPS TABLE
CREATE TABLE IF NOT EXISTS expense_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  household_id UUID NOT NULL
    REFERENCES households(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),

  created_by UUID
    REFERENCES profiles(id) ON DELETE SET NULL,

  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_expense_groups_household
  ON expense_groups(household_id);


-- 2. EXPENSE GROUP ITEMS (Individual payments/expenses)
CREATE TABLE IF NOT EXISTS expense_group_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  expense_group_id UUID NOT NULL
    REFERENCES expense_groups(id) ON DELETE CASCADE,

  household_id UUID NOT NULL
    REFERENCES households(id) ON DELETE CASCADE,

  profile_id UUID
    REFERENCES profiles(id) ON DELETE SET NULL,

  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,

  expense_date DATE DEFAULT CURRENT_DATE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,

  -- Optional linking to existing systems
  source_type TEXT CHECK (source_type IN ('expense', 'income', 'manual')),
  source_id UUID,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_expense_group_items_group
  ON expense_group_items(expense_group_id);

CREATE INDEX idx_expense_group_items_household
  ON expense_group_items(household_id);


-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE expense_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_group_items ENABLE ROW LEVEL SECURITY;


-- EXPENSE GROUP POLICIES
CREATE POLICY "Household members can manage expense groups"
ON expense_groups
FOR ALL
USING (household_id = get_user_household_id())
WITH CHECK (household_id = get_user_household_id());


-- EXPENSE GROUP ITEMS POLICIES
CREATE POLICY "Household members can manage expense group items"
ON expense_group_items
FOR ALL
USING (household_id = get_user_household_id())
WITH CHECK (household_id = get_user_household_id());


-- ============================================
-- TRIGGERS
-- ============================================

-- Auto update updated_at
CREATE OR REPLACE FUNCTION update_expense_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_expense_groups_updated_at
BEFORE UPDATE ON expense_groups
FOR EACH ROW
EXECUTE FUNCTION update_expense_groups_updated_at();


-- Validate household consistency
CREATE OR REPLACE FUNCTION validate_expense_group_item_household()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM expense_groups
    WHERE id = NEW.expense_group_id
      AND household_id = NEW.household_id
  ) THEN
    RAISE EXCEPTION 'Expense group and item household mismatch';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_expense_group_item_household
BEFORE INSERT OR UPDATE ON expense_group_items
FOR EACH ROW
EXECUTE FUNCTION validate_expense_group_item_household();


-- ============================================
-- RPC FUNCTIONS (SECURITY DEFINER)
-- ============================================

-- CREATE EXPENSE GROUP
CREATE OR REPLACE FUNCTION create_expense_group(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  INSERT INTO expense_groups (
    household_id,
    name,
    description,
    created_by,
    start_date
  )
  SELECT
    household_id,
    p_name,
    p_description,
    id,
    p_start_date
  FROM profiles
  WHERE id = auth.uid()
  RETURNING id INTO v_group_id;

  RETURN v_group_id;
END;
$$;


-- UPDATE EXPENSE GROUP
CREATE OR REPLACE FUNCTION update_expense_group(
  p_group_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_status TEXT,
  p_end_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE expense_groups
  SET
    name = p_name,
    description = p_description,
    status = p_status,
    end_date = p_end_date
  WHERE id = p_group_id
    AND household_id = get_user_household_id();
END;
$$;


-- DELETE EXPENSE GROUP (CASCADE deletes items)
CREATE OR REPLACE FUNCTION delete_expense_group(
  p_group_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM expense_groups
  WHERE id = p_group_id
    AND household_id = get_user_household_id();
END;
$$;


-- ADD EXPENSE GROUP ITEM
CREATE OR REPLACE FUNCTION add_expense_group_item(
  p_group_id UUID,
  p_amount DECIMAL,
  p_description TEXT,
  p_expense_date DATE DEFAULT CURRENT_DATE,
  p_source_type TEXT DEFAULT 'manual',
  p_source_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item_id UUID;
  v_household_id UUID;
BEGIN
  SELECT household_id
  INTO v_household_id
  FROM expense_groups
  WHERE id = p_group_id;

  INSERT INTO expense_group_items (
    expense_group_id,
    household_id,
    profile_id,
    amount,
    description,
    expense_date,
    category_id,
    source_type,
    source_id
  )
  VALUES (
    p_group_id,
    v_household_id,
    auth.uid(),
    p_amount,
    p_description,
    p_expense_date,
    NULL, -- category_id
    p_source_type,
    p_source_id
  )
  RETURNING id INTO v_item_id;

  RETURN v_item_id;
END;
$$;


-- DELETE EXPENSE GROUP ITEM
CREATE OR REPLACE FUNCTION delete_expense_group_item(
  p_item_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM expense_group_items
  WHERE id = p_item_id
    AND household_id = get_user_household_id();
END;
$$;

-- =========================================
-- EXPENSE GROUP MEMBERS
-- =========================================

create table if not exists public.expense_group_members (
    id uuid primary key default gen_random_uuid(),
    expense_group_id uuid not null
        references public.expense_groups(id)
        on delete cascade,
    profile_id uuid not null
        references public.profiles(id)
        on delete cascade,
    role text not null check (role in ('owner', 'member')),
    joined_at timestamptz not null default now(),
    unique (expense_group_id, profile_id)
);

create index if not exists idx_expense_group_members_group
    on public.expense_group_members (expense_group_id);

create index if not exists idx_expense_group_members_profile
    on public.expense_group_members (profile_id);

-- =========================================
-- RLS
-- =========================================

alter table public.expense_group_members enable row level security;

-- Members can read members of groups they belong to
create policy "expense_group_members_read"
on public.expense_group_members
for select
using (
    exists (
        select 1
        from public.expense_group_members m
        where m.expense_group_id = expense_group_members.expense_group_id
          and m.profile_id = auth.uid()
    )
);

-- No direct inserts / deletes / updates from client
-- All mutations via RPC only
create policy "expense_group_members_no_direct_insert"
on public.expense_group_members
for insert
with check (false);

create policy "expense_group_members_no_direct_update"
on public.expense_group_members
for update
using (false);

create policy "expense_group_members_no_direct_delete"
on public.expense_group_members
for delete
using (false);

-- =========================================
-- RPC: ADD MEMBER (OWNER ONLY)
-- =========================================

create or replace function public.add_expense_group_member(
    p_group_id uuid,
    p_profile_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
    -- only owner can add members
    if not exists (
        select 1
        from public.expense_group_members
        where expense_group_id = p_group_id
          and profile_id = auth.uid()
          and role = 'owner'
    ) then
        raise exception 'Unauthorized';
    end if;

    insert into public.expense_group_members (
        expense_group_id,
        profile_id,
        role
    )
    values (
        p_group_id,
        p_profile_id,
        'member'
    )
    on conflict do nothing;
end;
$$;

-- =========================================
-- RPC: REMOVE MEMBER (OWNER ONLY)
-- =========================================

create or replace function public.remove_expense_group_member(
    p_group_id uuid,
    p_profile_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
    -- only owner can remove members
    if not exists (
        select 1
        from public.expense_group_members
        where expense_group_id = p_group_id
          and profile_id = auth.uid()
          and role = 'owner'
    ) then
        raise exception 'Unauthorized';
    end if;

    -- owner cannot remove themselves
    if p_profile_id = auth.uid() then
        raise exception 'Owner cannot remove themselves';
    end if;

    delete from public.expense_group_members
    where expense_group_id = p_group_id
      and profile_id = p_profile_id;
end;
$$;

-- =========================================
-- TRIGGER: AUTO ADD OWNER ON GROUP CREATE
-- =========================================

create or replace function public.add_owner_to_expense_group()
returns trigger
language plpgsql
security definer
as $$
begin
    insert into public.expense_group_members (
        expense_group_id,
        profile_id,
        role
    )
    values (
        new.id,
        new.owner_profile_id,
        'owner'
    );

    return new;
end;
$$;

create trigger trg_add_owner_to_expense_group
after insert on public.expense_groups
for each row
execute function public.add_owner_to_expense_group();


-- Add missing column to expense_groups
ALTER TABLE expense_groups 
ADD COLUMN IF NOT EXISTS owner_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Update the create function to set owner_profile_id
CREATE OR REPLACE FUNCTION create_expense_group(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  INSERT INTO expense_groups (
    household_id,
    name,
    description,
    created_by,
    owner_profile_id,
    start_date
  )
  SELECT
    household_id,
    p_name,
    p_description,
    id,
    id, -- owner_profile_id same as created_by
    p_start_date
  FROM profiles
  WHERE id = auth.uid()
  RETURNING id INTO v_group_id;

  RETURN v_group_id;
END;
$$;

-- Create expense group with items and members in one transaction
CREATE OR REPLACE FUNCTION create_expense_group_with_details(
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_members JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_household_id UUID;
    v_group_id UUID;
    v_item JSONB;
    v_member JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get user's household_id
    SELECT household_id INTO v_household_id
    FROM profiles
    WHERE id = v_user_id;

    IF v_household_id IS NULL THEN
        RAISE EXCEPTION 'User not associated with a household';
    END IF;

    -- Create the expense group
    INSERT INTO expense_groups (
        household_id,
        name,
        description,
        created_by,
        owner_profile_id,
        start_date,
        status
    ) VALUES (
        v_household_id,
        p_name,
        p_description,
        v_user_id,
        v_user_id,
        p_start_date,
        'active'
    )
    RETURNING id INTO v_group_id;

    -- Insert items if provided
    IF p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            INSERT INTO expense_group_items (
                expense_group_id,
                household_id,
                profile_id,
                amount,
                description,
                expense_date,
                category_id,
                source_type,
                source_id
            ) VALUES (
                v_group_id,
                v_household_id,
                COALESCE((v_item->>'profile_id')::UUID, v_user_id),
                (v_item->>'amount')::NUMERIC,
                v_item->>'description',
                COALESCE((v_item->>'expense_date')::DATE, CURRENT_DATE),
                (v_item->>'category_id')::UUID,
                COALESCE(v_item->>'source_type', 'manual'),
                (v_item->>'source_id')::UUID
            );
        END LOOP;
    END IF;

    -- Insert additional members if provided (owner is auto-added by trigger)
    IF p_members IS NOT NULL AND jsonb_typeof(p_members) = 'array' AND jsonb_array_length(p_members) > 0 THEN
        FOR v_member IN SELECT * FROM jsonb_array_elements(p_members)
        LOOP
            -- Skip if trying to add owner (already added by trigger)
            IF (v_member->>'profile_id')::UUID != v_user_id THEN
                INSERT INTO expense_group_members (
                    expense_group_id,
                    profile_id,
                    role
                ) VALUES (
                    v_group_id,
                    (v_member->>'profile_id')::UUID,
                    COALESCE(v_member->>'role', 'member')
                )
                ON CONFLICT (expense_group_id, profile_id) DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    RETURN v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_expense_group_with_details(TEXT, TEXT, DATE, JSONB, JSONB) TO authenticated;

DROP POLICY IF EXISTS "Household members can manage expense groups"
ON expense_groups;

CREATE OR REPLACE FUNCTION is_expense_group_member(
  p_group_id UUID,
  p_profile_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM expense_group_members
    WHERE expense_group_id = p_group_id
      AND profile_id = p_profile_id
  );
$$;

DROP POLICY IF EXISTS expense_group_members_read
ON expense_group_members;

CREATE POLICY "Expense group members can read members"
ON expense_group_members
FOR SELECT
USING (
  is_expense_group_member(expense_group_id, auth.uid())
);

DROP POLICY IF EXISTS "Expense group members can read groups"
ON expense_groups;

CREATE POLICY "Expense group members can read groups"
ON expense_groups
FOR SELECT
USING (
  is_expense_group_member(id, auth.uid())
);

DROP POLICY IF EXISTS "Expense group members can read items"
ON expense_group_items;

CREATE POLICY "Expense group members can read items"
ON expense_group_items
FOR SELECT
USING (
  is_expense_group_member(expense_group_id, auth.uid())
);

REVOKE ALL ON FUNCTION is_expense_group_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_expense_group_member(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS expense_group_members_read ON expense_group_members;
CREATE POLICY "expense_group_members_read"
ON expense_group_members
FOR SELECT
USING (
  is_expense_group_member(expense_group_id, auth.uid())
);

-- Create expense group with members in one transaction
CREATE OR REPLACE FUNCTION create_expense_group_with_members(
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_members JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_household_id UUID;
    v_group_id UUID;
    v_member JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get user's household_id
    SELECT household_id INTO v_household_id
    FROM profiles
    WHERE id = v_user_id;

    IF v_household_id IS NULL THEN
        RAISE EXCEPTION 'User not associated with a household';
    END IF;

    -- Create the expense group
    INSERT INTO expense_groups (
        household_id,
        name,
        description,
        created_by,
        owner_profile_id,
        start_date,
        status
    ) VALUES (
        v_household_id,
        p_name,
        p_description,
        v_user_id,
        v_user_id,
        p_start_date,
        'active'
    )
    RETURNING id INTO v_group_id;

    -- Insert additional members if provided (owner is already auto-added by trg_add_owner_to_expense_group)
    IF p_members IS NOT NULL AND jsonb_typeof(p_members) = 'array' AND jsonb_array_length(p_members) > 0 THEN
        FOR v_member IN SELECT * FROM jsonb_array_elements(p_members)
        LOOP
            -- Skip if trying to add owner (already added by trigger)
            IF (v_member->>'profile_id')::UUID != v_user_id THEN
                INSERT INTO expense_group_members (
                    expense_group_id,
                    profile_id,
                    role
                ) VALUES (
                    v_group_id,
                    (v_member->>'profile_id')::UUID,
                    COALESCE(v_member->>'role', 'member')
                )
                ON CONFLICT (expense_group_id, profile_id) DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    RETURN v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_expense_group_with_members(TEXT, TEXT, DATE, JSONB) TO authenticated;

-- =========================================
-- EXPENSE GROUP ITEM SPLITS
-- =========================================

CREATE TABLE IF NOT EXISTS public.expense_group_item_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_group_item_id UUID NOT NULL
        REFERENCES public.expense_group_items(id)
        ON DELETE CASCADE,
    profile_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_group_item_splits_item
    ON public.expense_group_item_splits (expense_group_item_id);

CREATE INDEX IF NOT EXISTS idx_expense_group_item_splits_profile
    ON public.expense_group_item_splits (profile_id);

ALTER TABLE public.expense_group_item_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read splits in their groups"
ON public.expense_group_item_splits
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.expense_group_items i
        WHERE i.id = expense_group_item_id
          AND is_expense_group_member(i.expense_group_id, auth.uid())
    )
);

-- Update add_expense_group_item to handle splits
CREATE OR REPLACE FUNCTION add_expense_group_item(
  p_group_id UUID,
  p_amount DECIMAL,
  p_description TEXT,
  p_paid_by_profile_id UUID,
  p_expense_date DATE DEFAULT CURRENT_DATE,
  p_splits JSONB DEFAULT '[]'::jsonb, -- Array of {profile_id, amount}
  p_category_id UUID DEFAULT NULL,
  p_source_type TEXT DEFAULT 'manual',
  p_source_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item_id UUID;
  v_household_id UUID;
  v_split JSONB;
BEGIN
  -- Validation
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT is_expense_group_member(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a member of this expense group';
  END IF;

  SELECT household_id
  INTO v_household_id
  FROM expense_groups
  WHERE id = p_group_id;

  -- Insert item
  INSERT INTO expense_group_items (
    expense_group_id,
    household_id,
    profile_id, -- This maps to paid_by
    amount,
    description,
    expense_date,
    category_id,
    source_type,
    source_id
  )
  VALUES (
    p_group_id,
    v_household_id,
    p_paid_by_profile_id,
    p_amount,
    p_description,
    p_expense_date,
    p_category_id,
    p_source_type,
    p_source_id
  )
  RETURNING id INTO v_item_id;

  -- Insert splits
  IF p_splits IS NOT NULL AND jsonb_typeof(p_splits) = 'array' AND jsonb_array_length(p_splits) > 0 THEN
    FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits)
    LOOP
      INSERT INTO public.expense_group_item_splits (
        expense_group_item_id,
        profile_id,
        amount
      ) VALUES (
        v_item_id,
        (v_split->>'profile_id')::UUID,
        (v_split->>'amount')::NUMERIC
      );
    END LOOP;
  ELSE
    -- If no splits provided, default to single split for the payer
    INSERT INTO public.expense_group_item_splits (
        expense_group_item_id,
        profile_id,
        amount
    ) VALUES (
        v_item_id,
        p_paid_by_profile_id,
        p_amount
    );
  END IF;

  RETURN v_item_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_expense_group_item(UUID, DECIMAL, TEXT, UUID, DATE, JSONB, UUID, TEXT, UUID) TO authenticated;

-- Add category_id if it doesn't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_group_items' AND column_name = 'category_id') THEN
        ALTER TABLE expense_group_items ADD COLUMN category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL;
    END IF;
END $$;
