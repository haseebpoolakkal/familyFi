-- 1. HOUSEHOLDS TABLE
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PROFILES TABLE (Extends Auth.Users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    household_id UUID REFERENCES households(id) ON DELETE SET NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. EXPENSE CATEGORIES TABLE
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. INCOME TABLE
CREATE TABLE income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. GOALS TABLE
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount DECIMAL(12,2) NOT NULL,
    saved_amount DECIMAL(12,2) DEFAULT 0,
    allocation_percentage INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0,
    deadline DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. GOAL DISTRIBUTIONS (History of savings allocation)
CREATE TABLE goal_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    distributed_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Expense Template (Define Rule for expences)
CREATE TABLE expense_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,

    name TEXT NOT NULL,
    default_amount DECIMAL(12,2) NOT NULL,

    -- Fixed vs Variable
    is_fixed BOOLEAN DEFAULT FALSE,

    -- Recurrence rules (only for fixed expenses)
    recurrence TEXT CHECK (recurrence IN ('monthly', 'quarterly', 'yearly')),
    due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),

    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Expense Payment
CREATE TABLE expense_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_template_id UUID REFERENCES expense_templates(id) ON DELETE CASCADE,

    due_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,

    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Loan Table
create table if not exists loans (
  id uuid primary key default gen_random_uuid(),

  household_id uuid not null references households(id) on delete cascade,

  lender_name text not null,
  loan_type text,

  principal_amount numeric(12,2) not null,
  interest_rate numeric(5,2) not null,

  tenure_months integer,
  emi_amount numeric(12,2),

  start_date date not null,

  calculated_emi numeric(12,2) not null,
  calculated_tenure integer not null,

  total_payable numeric(12,2) not null,
  total_interest numeric(12,2) not null,

  outstanding_principal numeric(12,2) not null,

  status text not null default 'active'
    check (status in ('active', 'completed', 'closed_early')),

  created_at timestamp with time zone default now()
);

-- 12. Loan Installments Table
create table if not exists loan_installments (
  id uuid primary key default gen_random_uuid(),

  loan_id uuid not null references loans(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,

  installment_month date not null
    check (installment_month = date_trunc('month', installment_month)),

  emi_amount numeric(12,2) not null,
  principal_component numeric(12,2) not null,
  interest_component numeric(12,2) not null,

  paid boolean default false,
  paid_on date,

  created_at timestamp with time zone default now(),

  unique (loan_id, installment_month)
);

create index if not exists idx_loans_household
on loans(household_id);

create index if not exists idx_installments_household
on loan_installments(household_id);

create index if not exists idx_installments_loan_paid
on loan_installments(loan_id, paid);



-- Enable Row Level Security (RLS)
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_installments ENABLE ROW LEVEL SECURITY;


-- POLICIES

-- Profiles
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Households
CREATE POLICY "Users can view households they belong to or created" ON households 
FOR SELECT USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.household_id = households.id)
);

CREATE POLICY "Anyone can create a household" ON households 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Household-specific data access
CREATE POLICY "Household members can manage income" ON income 
FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.household_id = income.household_id));


CREATE POLICY "Household members can manage goals" ON goals 
FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.household_id = goals.household_id));

CREATE POLICY "Household members can manage distributions" ON goal_distributions 
FOR ALL USING (EXISTS (
    SELECT 1 FROM goals 
    JOIN profiles ON goals.household_id = profiles.household_id
    WHERE profiles.id = auth.uid() AND goal_distributions.goal_id = goals.id
));

CREATE POLICY "Household members can manage categories" ON expense_categories 
FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.household_id = expense_categories.household_id));

CREATE POLICY "Household members can manage expense templates"
ON expense_templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.household_id = expense_templates.household_id
  )
);

CREATE POLICY "Household members can manage expense payments"
ON expense_payments
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM expense_templates et
    JOIN profiles p ON p.household_id = et.household_id
    WHERE et.id = expense_payments.expense_template_id
      AND p.id = auth.uid()
  )
);

create policy "household loans access"
on loans
for all
using (household_id = get_user_household_id())
with check (household_id = get_user_household_id());

create policy "household loan installments access"
on loan_installments
for all
using (household_id = get_user_household_id())
with check (household_id = get_user_household_id());


-- FUNCTIONS & TRIGGERS

create or replace function get_user_household_id()
returns uuid
language sql
stable
security definer
as $$
  select household_id
  from profiles
  where id = auth.uid()
  limit 1;
$$;

grant execute on function get_user_household_id() to authenticated;


-- Set household owner on creation
CREATE OR REPLACE FUNCTION set_household_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_household_created
  BEFORE INSERT ON households
  FOR EACH ROW EXECUTE PROCEDURE set_household_owner();

-- Handle profile creation on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RPC FUNCTION FOR SECURE ONBOARDING
CREATE OR REPLACE FUNCTION create_new_household(
  h_name TEXT,
  u_name TEXT
)
RETURNS UUID AS $$
DECLARE
  new_h_id UUID;
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO households (name, created_by)
  VALUES (h_name, uid)
  RETURNING id INTO new_h_id;

  INSERT INTO profiles (id, household_id, full_name, role)
  VALUES (uid, new_h_id, u_name, 'member')
  ON CONFLICT (id) DO UPDATE SET
    household_id = new_h_id,
    full_name = u_name,
    role = 'member';

  RETURN new_h_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_fixed_expense(
  p_name TEXT,
  p_amount DECIMAL,
  p_category_id UUID,
  p_recurrence TEXT,
  p_due_day INTEGER
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO expense_templates (
    household_id,
    category_id,
    name,
    default_amount,
    is_fixed,
    recurrence,
    due_day
  )
  SELECT
    household_id,
    p_category_id,
    p_name,
    p_amount,
    true,
    p_recurrence,
    p_due_day
  FROM profiles
  WHERE id = auth.uid()
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

create or replace function validate_installment_household()
returns trigger as $$
begin
  if not exists (
    select 1
    from loans
    where id = new.loan_id
      and household_id = new.household_id
  ) then
    raise exception 'Loan and installment household mismatch';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_validate_installment_household
before insert or update on loan_installments
for each row
execute function validate_installment_household();

create or replace function update_loan_outstanding()
returns trigger as $$
begin
  if new.paid = true and old.paid = false then
    update loans
    set outstanding_principal =
      outstanding_principal - new.principal_component
    where id = new.loan_id;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_update_loan_outstanding
after update of paid on loan_installments
for each row
execute function update_loan_outstanding();

create or replace function close_loan_if_completed()
returns trigger as $$
begin
  if new.outstanding_principal <= 0 then
    update loans
    set status = 'completed'
    where id = new.id;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_close_loan
after update on loans
for each row
when (new.outstanding_principal <= 0)
execute function close_loan_if_completed();

create or replace function prevent_paid_installment_edit()
returns trigger as $$
begin
  if old.paid = true then
    raise exception 'Paid installments cannot be modified';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_lock_paid_installments
before update on loan_installments
for each row
execute function prevent_paid_installment_edit();


create or replace function generate_loan_installments(
  p_loan_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_household_id uuid;
  v_principal numeric;
  v_rate numeric;
  v_emi numeric;
  v_tenure integer;
  v_start_date date;
  v_balance numeric;
  v_interest numeric;
  v_principal_component numeric;
  i integer;
begin
  select
    household_id,
    principal_amount,
    interest_rate,
    calculated_emi,
    calculated_tenure,
    start_date
  into
    v_household_id,
    v_principal,
    v_rate,
    v_emi,
    v_tenure,
    v_start_date
  from loans
  where id = p_loan_id;

  v_balance := v_principal;
  v_rate := v_rate / 1200; -- monthly rate

  for i in 1..v_tenure loop
    v_interest := round(v_balance * v_rate, 2);
    v_principal_component := round(v_emi - v_interest, 2);

    insert into loan_installments (
      loan_id,
      household_id,
      installment_month,
      emi_amount,
      principal_component,
      interest_component
    ) values (
      p_loan_id,
      v_household_id,
      date_trunc('month', v_start_date + (i - 1) * interval '1 month'),
      v_emi,
      v_principal_component,
      v_interest
    );

    v_balance := v_balance - v_principal_component;
  end loop;
end;
$$;

create or replace function apply_loan_prepayment(
  p_installment_id uuid,
  p_extra_amount numeric
)
returns void
language plpgsql
security definer
as $$
declare
  v_loan_id uuid;
begin
  select loan_id
  into v_loan_id
  from loan_installments
  where id = p_installment_id;

  -- Mark installment as paid
  update loan_installments
  set paid = true,
      paid_on = current_date
  where id = p_installment_id;

  -- Reduce outstanding principal
  update loans
  set outstanding_principal =
      greatest(outstanding_principal - p_extra_amount, 0)
  where id = v_loan_id;
end;
$$;

create or replace function close_loan_early(
  p_loan_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  -- Close loan
  update loans
  set status = 'closed_early',
      outstanding_principal = 0
  where id = p_loan_id;

  -- Mark all unpaid installments as paid (system-closed)
  update loan_installments
  set paid = true,
      paid_on = current_date
  where loan_id = p_loan_id
    and paid = false;
end;
$$;

