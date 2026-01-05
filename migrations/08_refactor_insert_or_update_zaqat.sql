-- =====================================================
-- ZAKAT RPC FUNCTIONS
-- =====================================================

-- =====================================================
-- 1. ZAKAT SETTINGS FUNCTIONS
-- =====================================================

-- Create or update zakat settings (upsert)
-- Returns the complete settings record
CREATE OR REPLACE FUNCTION upsert_zakat_settings(
    p_anniversary_date DATE,
    p_nisab_type TEXT DEFAULT 'silver',
    p_school_of_thought TEXT DEFAULT 'hanafi'
)
RETURNS zakat_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID := auth.uid();
    v_settings zakat_settings;
BEGIN
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate nisab_type
    IF p_nisab_type NOT IN ('silver', 'gold') THEN
        RAISE EXCEPTION 'Invalid nisab_type. Must be silver or gold';
    END IF;

    -- Validate school_of_thought
    IF p_school_of_thought NOT IN ('hanafi', 'shafi', 'maliki', 'hanbali') THEN
        RAISE EXCEPTION 'Invalid school_of_thought';
    END IF;

    INSERT INTO zakat_settings (
        profile_id,
        anniversary_date,
        nisab_type,
        school_of_thought
    ) VALUES (
        v_profile_id,
        p_anniversary_date,
        p_nisab_type,
        p_school_of_thought
    )
    ON CONFLICT (profile_id) 
    DO UPDATE SET
        anniversary_date = p_anniversary_date,
        nisab_type = p_nisab_type,
        school_of_thought = p_school_of_thought,
        updated_at = now()
    RETURNING * INTO v_settings;

    RETURN v_settings;
END;
$$;

-- Update zakat settings
CREATE OR REPLACE FUNCTION update_zakat_settings(
    p_settings_id UUID,
    p_anniversary_date DATE DEFAULT NULL,
    p_nisab_type TEXT DEFAULT NULL,
    p_school_of_thought TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID := auth.uid();
BEGIN
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate ownership
    IF NOT EXISTS (
        SELECT 1 FROM zakat_settings 
        WHERE id = p_settings_id AND profile_id = v_profile_id
    ) THEN
        RAISE EXCEPTION 'Settings not found or access denied';
    END IF;

    UPDATE zakat_settings
    SET
        anniversary_date = COALESCE(p_anniversary_date, anniversary_date),
        nisab_type = COALESCE(p_nisab_type, nisab_type),
        school_of_thought = COALESCE(p_school_of_thought, school_of_thought),
        updated_at = now()
    WHERE id = p_settings_id AND profile_id = v_profile_id;

    RETURN FOUND;
END;
$$;

-- Delete zakat settings
CREATE OR REPLACE FUNCTION delete_zakat_settings(p_settings_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID := auth.uid();
BEGIN
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    DELETE FROM zakat_settings
    WHERE id = p_settings_id AND profile_id = v_profile_id;

    RETURN FOUND;
END;
$$;

-- =====================================================
-- 2. ZAKAT SNAPSHOT FUNCTIONS
-- =====================================================

-- Create zakat snapshot with assets and liabilities
-- Returns the complete snapshot with items
CREATE OR REPLACE FUNCTION create_zakat_snapshot_with_items(
    p_snapshot_date DATE,
    p_zakat_year_start DATE,
    p_zakat_year_end DATE,
    p_nisab_threshold DECIMAL,
    p_nisab_type TEXT,
    p_total_zakatable_assets DECIMAL,
    p_total_deductible_liabilities DECIMAL,
    p_net_zakatable_wealth DECIMAL,
    p_zakat_due DECIMAL,
    p_assets JSONB DEFAULT '[]'::jsonb,
    p_liabilities JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID := auth.uid();
    v_snapshot_id UUID;
    v_asset JSONB;
    v_liability JSONB;
BEGIN
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate nisab_type
    IF p_nisab_type NOT IN ('silver', 'gold') THEN
        RAISE EXCEPTION 'Invalid nisab_type. Must be silver or gold';
    END IF;

    -- Create snapshot
    INSERT INTO zakat_snapshots (
        profile_id,
        snapshot_date,
        zakat_year_start,
        zakat_year_end,
        nisab_threshold,
        nisab_type,
        total_zakatable_assets,
        total_deductible_liabilities,
        net_zakatable_wealth,
        zakat_due
    ) VALUES (
        v_profile_id,
        p_snapshot_date,
        p_zakat_year_start,
        p_zakat_year_end,
        p_nisab_threshold,
        p_nisab_type,
        p_total_zakatable_assets,
        p_total_deductible_liabilities,
        p_net_zakatable_wealth,
        p_zakat_due
    )
    RETURNING id INTO v_snapshot_id;

    -- Insert assets if provided
    IF jsonb_array_length(p_assets) > 0 THEN
        FOR v_asset IN SELECT * FROM jsonb_array_elements(p_assets)
        LOOP
            INSERT INTO zakat_asset_items (
                snapshot_id,
                asset_type,
                asset_name,
                source_type,
                source_id,
                market_value,
                is_included,
                notes
            ) VALUES (
                v_snapshot_id,
                v_asset->>'asset_type',
                v_asset->>'asset_name',
                v_asset->>'source_type',
                (v_asset->>'source_id')::UUID,
                (v_asset->>'market_value')::DECIMAL,
                COALESCE((v_asset->>'is_included')::BOOLEAN, true),
                v_asset->>'notes'
            );
        END LOOP;
    END IF;

    -- Insert liabilities if provided
    IF jsonb_array_length(p_liabilities) > 0 THEN
        FOR v_liability IN SELECT * FROM jsonb_array_elements(p_liabilities)
        LOOP
            INSERT INTO zakat_liability_items (
                snapshot_id,
                liability_type,
                liability_name,
                source_type,
                source_id,
                amount_due_next_12_months,
                is_included,
                notes
            ) VALUES (
                v_snapshot_id,
                v_liability->>'liability_type',
                v_liability->>'liability_name',
                v_liability->>'source_type',
                (v_liability->>'source_id')::UUID,
                (v_liability->>'amount_due_next_12_months')::DECIMAL,
                COALESCE((v_liability->>'is_included')::BOOLEAN, true),
                v_liability->>'notes'
            );
        END LOOP;
    END IF;

    RETURN v_snapshot_id;
END;
$$;

-- Update zakat snapshot totals (called after assets/liabilities are updated)
CREATE OR REPLACE FUNCTION update_zakat_snapshot_totals(
    p_snapshot_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID := auth.uid();
    v_total_assets DECIMAL;
    v_total_liabilities DECIMAL;
    v_net_wealth DECIMAL;
    v_zakat_due DECIMAL;
    v_nisab_threshold DECIMAL;
BEGIN
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate ownership
    IF NOT EXISTS (
        SELECT 1 FROM zakat_snapshots 
        WHERE id = p_snapshot_id AND profile_id = v_profile_id
    ) THEN
        RAISE EXCEPTION 'Snapshot not found or access denied';
    END IF;

    -- Calculate total assets
    SELECT COALESCE(SUM(market_value), 0)
    INTO v_total_assets
    FROM zakat_asset_items
    WHERE snapshot_id = p_snapshot_id AND is_included = true;

    -- Calculate total liabilities
    SELECT COALESCE(SUM(amount_due_next_12_months), 0)
    INTO v_total_liabilities
    FROM zakat_liability_items
    WHERE snapshot_id = p_snapshot_id AND is_included = true;

    -- Calculate net wealth
    v_net_wealth := v_total_assets - v_total_liabilities;

    -- Get nisab threshold
    SELECT nisab_threshold INTO v_nisab_threshold
    FROM zakat_snapshots
    WHERE id = p_snapshot_id;

    -- Calculate zakat due (2.5% if above nisab)
    IF v_net_wealth >= v_nisab_threshold THEN
        v_zakat_due := ROUND(v_net_wealth * 0.025, 2);
    ELSE
        v_zakat_due := 0;
    END IF;

    -- Update snapshot
    UPDATE zakat_snapshots
    SET
        total_zakatable_assets = v_total_assets,
        total_deductible_liabilities = v_total_liabilities,
        net_zakatable_wealth = v_net_wealth,
        zakat_due = v_zakat_due
    WHERE id = p_snapshot_id AND profile_id = v_profile_id;

    RETURN FOUND;
END;
$$;

-- Delete zakat snapshot (cascades to assets and liabilities)
CREATE OR REPLACE FUNCTION delete_zakat_snapshot(p_snapshot_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID := auth.uid();
BEGIN
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    DELETE FROM zakat_snapshots
    WHERE id = p_snapshot_id AND profile_id = v_profile_id;

    RETURN FOUND;
END;
$$;

-- =====================================================
-- 3. ZAKAT ASSET ITEMS FUNCTIONS
-- =====================================================

-- Create zakat asset item
CREATE OR REPLACE FUNCTION create_zakat_asset_item(
    p_snapshot_id UUID,
    p_asset_type TEXT,
    p_asset_name TEXT,
    p_market_value DECIMAL,
    p_source_type TEXT DEFAULT NULL,
    p_source_id UUID DEFAULT NULL,
    p_is_included BOOLEAN DEFAULT true,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID := auth.uid();
    v_asset_id UUID;
BEGIN
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate snapshot ownership
    IF NOT EXISTS (
        SELECT 1 FROM zakat_snapshots 
        WHERE id = p_snapshot_id AND profile_id = v_profile_id
    ) THEN
        RAISE EXCEPTION 'Snapshot not found or access denied';
    END IF;

    -- Validate asset_type
    IF p_asset_type NOT IN (
        'cash', 'bank_balance', 'savings', 'emergency_fund',
        'investment', 'gold', 'silver', 'receivable', 'other'
    ) THEN
        RAISE EXCEPTION 'Invalid asset_type';
    END IF;

    INSERT INTO zakat_asset_items (
        snapshot_id,
        asset_type,
        asset_name,
        source_type,
        source_id,
        market_value,
        is_included,
        notes
    ) VALUES (
        p_snapshot_id,
        p_asset_type,
        p_asset_name,
        p_source_type,
        p_source_id,
        p_market_value,
        p_is_included,
        p_notes
    )
    RETURNING id INTO v_asset_id;

    -- Update snapshot totals
    PERFORM update_zakat_snapshot_totals(p_snapshot_id);

    RETURN v_asset_id;
END;
$$;

-- Update zakat asset item
CREATE OR REPLACE FUNCTION update_zakat_asset_item(
    p_asset_id UUID,
    p_asset_type TEXT DEFAULT NULL,
    p_asset_name TEXT DEFAULT NULL,
    p_market_value DECIMAL DEFAULT NULL,
    p_source_type TEXT DEFAULT NULL,
    p_source_id UUID DEFAULT NULL,
    p_is_included BOOLEAN DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID := auth.uid();
    v_snapshot_id UUID;
BEGIN
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate ownership through snapshot
    SELECT snapshot_id INTO v_snapshot_id
    FROM zakat_asset_items
    WHERE id = p_asset_id
    AND EXISTS (
        SELECT 1 FROM zakat_snapshots 
        WHERE zakat_snapshots.id = zakat_asset_items.snapshot_id 
        AND zakat_snapshots.profile_id = v_profile_id
    );

    IF v_snapshot_id IS NULL THEN
        RAISE EXCEPTION 'Asset item not found or access denied';
    END IF;

    UPDATE zakat_asset_items
    SET
        asset_type = COALESCE(p_asset_type, asset_type),
        asset_name = COALESCE(p_asset_name, asset_name),
        market_value = COALESCE(p_market_value, market_value),
        source_type = COALESCE(p_source_type, source_type),
        source_id = COALESCE(p_source_id, source_id),
        is_included = COALESCE(p_is_included, is_included),
        notes = COALESCE(p_notes, notes)
    WHERE id = p_asset_id;

    -- Update snapshot totals
    PERFORM update_zakat_snapshot_totals(v_snapshot_id);

    RETURN FOUND;
END;
$$;

-- Delete zakat asset item
CREATE OR REPLACE FUNCTION delete_zakat_asset_item(p_asset_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID := auth.uid();
    v_snapshot_id UUID;
BEGIN
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get snapshot_id before deletion
    SELECT snapshot_id INTO v_snapshot_id
    FROM zakat_asset_items
    WHERE id = p_asset_id
    AND EXISTS (
        SELECT 1 FROM zakat_snapshots 
        WHERE zakat_snapshots.id = zakat_asset_items.snapshot_id 
        AND zakat_snapshots.profile_id = v_profile_id
    );

    IF v_snapshot_id IS NULL THEN
        RAISE EXCEPTION 'Asset item not found or access denied';
    END IF;

    DELETE FROM zakat_asset_items WHERE id = p_asset_id;

    -- Update snapshot totals
    PERFORM update_zakat_snapshot_totals(v_snapshot_id);

    RETURN FOUND;
END;
$$;

-- Bulk create asset items
CREATE OR REPLACE FUNCTION bulk_create_zakat_asset_items(
    p_snapshot_id UUID,
    p_assets JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID := auth.uid();
    v_asset JSONB;
BEGIN
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate snapshot ownership
    IF NOT EXISTS (
        SELECT 1 FROM zakat_snapshots 
        WHERE id = p_snapshot_id AND profile_id = v_profile_id
    ) THEN
        RAISE EXCEPTION 'Snapshot not found or access denied';
    END IF;

    -- Insert each asset
    FOR v_asset IN SELECT * FROM jsonb_array_elements(p_assets)
    LOOP
        INSERT INTO zakat_asset_items (
            snapshot_id,
            asset_type,
            asset_name,
            source_type,
            source_id,
            market_value,
            is_included,
            notes
        ) VALUES (
            p_snapshot_id,
            v_asset->>'asset_type',
            v_asset->>'asset_name',
            v_asset->>'source_type',
            (v_asset->>'source_id')::UUID,
            (v_asset->>'market_value')::DECIMAL,
            COALESCE((v_asset->>'is_included')::BOOLEAN, true),
            v_asset->>'notes'
        );
    END LOOP;

    -- Update snapshot totals once at the end
    PERFORM update_zakat_snapshot_totals(p_snapshot_id);

    RETURN true;
END;
$$;

-- =====================================================
-- 4. ZAKAT LIABILITY ITEMS FUNCTIONS
-- =====================================================

-- Create zakat liability item
CREATE OR REPLACE FUNCTION create_zakat_liability_item(
    p_snapshot_id UUID,
    p_liability_type TEXT,
    p_liability_name TEXT,
    p_amount_due_next_12_months DECIMAL,
    p_source_type TEXT DEFAULT NULL,
    p_source_id UUID DEFAULT NULL,
    p_is_included BOOLEAN DEFAULT true,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID := auth.uid();
    v_liability_id UUID;
BEGIN
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate snapshot ownership
    IF NOT EXISTS (
        SELECT 1 FROM zakat_snapshots 
        WHERE id = p_snapshot_id AND profile_id = v_profile_id
    ) THEN
        RAISE EXCEPTION 'Snapshot not found or access denied';
    END IF;

    -- Validate liability_type
    IF p_liability_type NOT IN (
        'emi', 'credit_card', 'short_term_debt', 'unpaid_bill', 'other'
    ) THEN
        RAISE EXCEPTION 'Invalid liability_type';
    END IF;

    INSERT INTO zakat_liability_items (
        snapshot_id,
        liability_type,
        liability_name,
        source_type,
        source_id,
        amount_due_next_12_months,
        is_included,
        notes
    ) VALUES (
        p_snapshot_id,
        p_liability_type,
        p_liability_name,
        p_source_type,
        p_source_id,
        p_amount_due_next_12_months,
        p_is_included,
        p_notes
    )
    RETURNING id INTO v_liability_id;

    -- Update snapshot totals
    PERFORM update_zakat_snapshot_totals(p_snapshot_id);

    RETURN v_liability_id;
END;
$$;

-- Update zakat liability item
CREATE OR REPLACE FUNCTION update_zakat_liability_item(
    p_liability_id UUID,
    p_liability_type TEXT DEFAULT NULL,
    p_liability_name TEXT DEFAULT NULL,
    p_amount_due_next_12_months DECIMAL DEFAULT NULL,
    p_source_type TEXT DEFAULT NULL,
    p_source_id UUID DEFAULT NULL,
    p_is_included BOOLEAN DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID := auth.uid();
    v_snapshot_id UUID;
BEGIN
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate ownership through snapshot
    SELECT snapshot_id INTO v_snapshot_id
    FROM zakat_liability_items
    WHERE id = p_liability_id
    AND EXISTS (
        SELECT 1 FROM zakat_snapshots 
        WHERE zakat_snapshots.id = zakat_liability_items.snapshot_id 
        AND zakat_snapshots.profile_id = v_profile_id
    );

    IF v_snapshot_id IS NULL THEN
        RAISE EXCEPTION 'Liability item not found or access denied';
    END IF;

    UPDATE zakat_liability_items
    SET
        liability_type = COALESCE(p_liability_type, liability_type),
        liability_name = COALESCE(p_liability_name, liability_name),
        amount_due_next_12_months = COALESCE(p_amount_due_next_12_months, amount_due_next_12_months),
        source_type = COALESCE(p_source_type, source_type),
        source_id = COALESCE(p_source_id, source_id),
        is_included = COALESCE(p_is_included, is_included),
        notes = COALESCE(p_notes, notes)
    WHERE id = p_liability_id;

    -- Update snapshot totals
    PERFORM update_zakat_snapshot_totals(v_snapshot_id);

    RETURN FOUND;
END;
$$;

-- Delete zakat liability item
CREATE OR REPLACE FUNCTION delete_zakat_liability_item(p_liability_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID := auth.uid();
    v_snapshot_id UUID;
BEGIN
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get snapshot_id before deletion
    SELECT snapshot_id INTO v_snapshot_id
    FROM zakat_liability_items
    WHERE id = p_liability_id
    AND EXISTS (
        SELECT 1 FROM zakat_snapshots 
        WHERE zakat_snapshots.id = zakat_liability_items.snapshot_id 
        AND zakat_snapshots.profile_id = v_profile_id
    );

    IF v_snapshot_id IS NULL THEN
        RAISE EXCEPTION 'Liability item not found or access denied';
    END IF;

    DELETE FROM zakat_liability_items WHERE id = p_liability_id;

    -- Update snapshot totals
    PERFORM update_zakat_snapshot_totals(v_snapshot_id);

    RETURN FOUND;
END;
$$;

-- Bulk create liability items
CREATE OR REPLACE FUNCTION bulk_create_zakat_liability_items(
    p_snapshot_id UUID,
    p_liabilities JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID := auth.uid();
    v_liability JSONB;
BEGIN
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate snapshot ownership
    IF NOT EXISTS (
        SELECT 1 FROM zakat_snapshots 
        WHERE id = p_snapshot_id AND profile_id = v_profile_id
    ) THEN
        RAISE EXCEPTION 'Snapshot not found or access denied';
    END IF;

    -- Insert each liability
    FOR v_liability IN SELECT * FROM jsonb_array_elements(p_liabilities)
    LOOP
        INSERT INTO zakat_liability_items (
            snapshot_id,
            liability_type,
            liability_name,
            source_type,
            source_id,
            amount_due_next_12_months,
            is_included,
            notes
        ) VALUES (
            p_snapshot_id,
            v_liability->>'liability_type',
            v_liability->>'liability_name',
            v_liability->>'source_type',
            (v_liability->>'source_id')::UUID,
            (v_liability->>'amount_due_next_12_months')::DECIMAL,
            COALESCE((v_liability->>'is_included')::BOOLEAN, true),
            v_liability->>'notes'
        );
    END LOOP;

    -- Update snapshot totals once at the end
    PERFORM update_zakat_snapshot_totals(p_snapshot_id);

    RETURN true;
END;
$$;

-- =====================================================
-- 5. GOLD/SILVER PRICES FUNCTIONS
-- =====================================================

-- Upsert gold/silver prices
CREATE OR REPLACE FUNCTION upsert_gold_silver_prices(
    p_date DATE,
    p_gold_price_per_gram_usd DECIMAL,
    p_silver_price_per_gram_usd DECIMAL,
    p_exchange_rate_usd_to_inr DECIMAL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_price_id UUID;
BEGIN
    INSERT INTO gold_silver_prices (
        date,
        gold_price_per_gram_usd,
        silver_price_per_gram_usd,
        exchange_rate_usd_to_inr
    ) VALUES (
        p_date,
        p_gold_price_per_gram_usd,
        p_silver_price_per_gram_usd,
        p_exchange_rate_usd_to_inr
    )
    ON CONFLICT (date) 
    DO UPDATE SET
        gold_price_per_gram_usd = p_gold_price_per_gram_usd,
        silver_price_per_gram_usd = p_silver_price_per_gram_usd,
        exchange_rate_usd_to_inr = p_exchange_rate_usd_to_inr,
        updated_at = now()
    RETURNING id INTO v_price_id;

    RETURN v_price_id;
END;
$$;

-- =====================================================
-- 6. UTILITY FUNCTIONS
-- =====================================================

-- Calculate nisab threshold based on current prices
CREATE OR REPLACE FUNCTION calculate_nisab_threshold(
    p_nisab_type TEXT,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_threshold DECIMAL;
    v_gold_price DECIMAL;
    v_silver_price DECIMAL;
    v_exchange_rate DECIMAL;
BEGIN
    -- Get prices for the date (or closest available date)
    SELECT 
        gold_price_per_gram_usd,
        silver_price_per_gram_usd,
        exchange_rate_usd_to_inr
    INTO v_gold_price, v_silver_price, v_exchange_rate
    FROM gold_silver_prices
    WHERE date <= p_date
    ORDER BY date DESC
    LIMIT 1;

    IF v_gold_price IS NULL THEN
        RAISE EXCEPTION 'No price data available for date %', p_date;
    END IF;

    -- Calculate nisab based on type
    -- Gold: 85 grams (3 ounces)
    -- Silver: 595 grams (21 ounces) per Hanafi school
    IF p_nisab_type = 'gold' THEN
        v_threshold := ROUND(85 * v_gold_price * v_exchange_rate, 2);
    ELSIF p_nisab_type = 'silver' THEN
        v_threshold := ROUND(595 * v_silver_price * v_exchange_rate, 2);
    ELSE
        RAISE EXCEPTION 'Invalid nisab_type. Must be gold or silver';
    END IF;

    RETURN v_threshold;
END;
$$;

-- Get or create complete snapshot with calculation
CREATE OR REPLACE FUNCTION create_complete_zakat_snapshot(
    p_snapshot_date DATE,
    p_assets JSONB DEFAULT '[]'::jsonb,
    p_liabilities JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID := auth.uid();
    v_snapshot_id UUID;
    v_settings RECORD;
    v_nisab_threshold DECIMAL;
    v_year_start DATE;
    v_year_end DATE;
BEGIN
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get user's zakat settings
    SELECT * INTO v_settings
    FROM zakat_settings
    WHERE profile_id = v_profile_id;

    IF v_settings IS NULL THEN
        RAISE EXCEPTION 'Zakat settings not configured. Please set up your zakat settings first.';
    END IF;

    -- Calculate zakat year boundaries
    v_year_end := p_snapshot_date;
    v_year_start := v_year_end - INTERVAL '1 year';

    -- Calculate nisab threshold
    v_nisab_threshold := calculate_nisab_threshold(v_settings.nisab_type, p_snapshot_date);

    -- Create snapshot
    v_snapshot_id := create_zakat_snapshot(
        p_snapshot_date,
        v_year_start,
        v_year_end,
        v_nisab_threshold,
        v_settings.nisab_type
    );

    -- Add assets if provided
    IF jsonb_array_length(p_assets) > 0 THEN
        PERFORM bulk_create_zakat_asset_items(v_snapshot_id, p_assets);
    END IF;

    -- Add liabilities if provided
    IF jsonb_array_length(p_liabilities) > 0 THEN
        PERFORM bulk_create_zakat_liability_items(v_snapshot_id, p_liabilities);
    END IF;

    RETURN v_snapshot_id;
END;
$$;

-- =====================================================
-- GRANTS
-- =====================================================

GRANT EXECUTE ON FUNCTION upsert_zakat_settings(DATE, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_zakat_settings(UUID, DATE, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_zakat_settings(UUID) TO authenticated;

GRANT EXECUTE ON FUNCTION create_zakat_snapshot_with_items(DATE, DATE, DATE, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, DECIMAL, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_zakat_snapshot_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_zakat_snapshot(UUID) TO authenticated;

GRANT EXECUTE ON FUNCTION create_zakat_asset_item(UUID, TEXT, TEXT, DECIMAL, TEXT, UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_zakat_asset_item(UUID, TEXT, TEXT, DECIMAL, TEXT, UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_zakat_asset_item(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_create_zakat_asset_items(UUID, JSONB) TO authenticated;

GRANT EXECUTE ON FUNCTION create_zakat_liability_item(UUID, TEXT, TEXT, DECIMAL, TEXT, UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_zakat_liability_item(UUID, TEXT, TEXT, DECIMAL, TEXT, UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_zakat_liability_item(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_create_zakat_liability_items(UUID, JSONB) TO authenticated;

GRANT EXECUTE ON FUNCTION upsert_gold_silver_prices(DATE, DECIMAL, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_nisab_threshold(TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION create_complete_zakat_snapshot(DATE, JSONB, JSONB) TO authenticated;

-- =====================================================
-- END OF ZAKAT RPC FUNCTIONS
-- =====================================================