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


-- Enable Row Level Security (RLS)
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_payments ENABLE ROW LEVEL SECURITY;


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


-- FUNCTIONS & TRIGGERS

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
