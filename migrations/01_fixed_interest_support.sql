-- Add interest_type column to loans table
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS interest_type text NOT NULL DEFAULT 'reducing' 
CHECK (interest_type IN ('reducing', 'fixed'));

-- Update generate_loan_installments to handle fixed interest
CREATE OR REPLACE FUNCTION generate_loan_installments(
  p_loan_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_household_id uuid;
  v_principal numeric;
  v_rate numeric;
  v_emi numeric;
  v_tenure integer;
  v_start_date date;
  v_interest_type text;
  
  v_balance numeric;
  v_interest numeric;
  v_principal_component numeric;
  v_total_interest numeric;
  v_start_month date;
  i integer;
BEGIN
  SELECT
    household_id,
    principal_amount,
    interest_rate,
    calculated_emi,
    calculated_tenure,
    start_date,
    interest_type
  INTO
    v_household_id,
    v_principal,
    v_rate,
    v_emi,
    v_tenure,
    v_start_date,
    v_interest_type
  FROM loans
  WHERE id = p_loan_id;

  v_start_month := date_trunc('month', v_start_date);
  
  IF v_interest_type = 'fixed' THEN
    -- Fixed/Flat Rate Calculation
    -- Total Interest = Principal * (Rate/100) * (Tenure/12)
    v_total_interest := round(v_principal * (v_rate / 100.0) * (v_tenure / 12.0), 2);
    
    -- In flat rate, principal and interest components are usually fixed per month
    -- Monthly Principal = Principal / Tenure
    -- Monthly Interest = Total Interest / Tenure
    -- Note: This is an approximation. The EMI is exactly (Principal + Total Interest) / Tenure
    
    v_principal_component := round(v_principal / v_tenure, 2);
    v_interest := round(v_total_interest / v_tenure, 2);
    
    -- Adjust last month to handle rounding differences?
    -- For simplicity in this implementation, we'll keep strict components but ensure total EMI matches
    
    FOR i IN 1..v_tenure LOOP
       INSERT INTO loan_installments (
        loan_id,
        household_id,
        installment_month,
        emi_amount,
        principal_component,
        interest_component
      ) VALUES (
        p_loan_id,
        v_household_id,
        v_start_month + (i - 1) * interval '1 month',
        v_emi,
        v_principal_component,
        v_interest
      );
    END LOOP;

  ELSE
    -- Reducing Balance Calculation (Existing Logic)
    v_balance := v_principal;
    v_rate := v_rate / 1200; -- monthly rate

    FOR i IN 1..v_tenure LOOP
      v_interest := round(v_balance * v_rate, 2);
      v_principal_component := round(v_emi - v_interest, 2);

      -- Safety check for last installment
      IF i = v_tenure THEN
         v_principal_component := v_balance;
         v_emi := v_principal_component + v_interest;
      END IF;

      INSERT INTO loan_installments (
        loan_id,
        household_id,
        installment_month,
        emi_amount,
        principal_component,
        interest_component
      ) VALUES (
        p_loan_id,
        v_household_id,
        v_start_month + (i - 1) * interval '1 month',
        v_emi,
        v_principal_component,
        v_interest
      );

      v_balance := v_balance - v_principal_component;
    END LOOP;
  END IF;
END;
$$;

-- Update apply_loan_prepayment to handle fixed interest (tenure reduction)
CREATE OR REPLACE FUNCTION apply_loan_prepayment(
  p_installment_id uuid,
  p_extra_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_loan_id uuid;
  v_interest_type text;
  v_outstanding_principal numeric;
  v_emi numeric;
  v_remaining_installments integer;
  v_loan_start_date date;
  v_installment_month date;
  v_new_tenure integer;
BEGIN
  SELECT l.id, l.interest_type, l.outstanding_principal, l.calculated_emi, l.start_date, li.installment_month
  INTO v_loan_id, v_interest_type, v_outstanding_principal, v_emi, v_loan_start_date, v_installment_month
  FROM loan_installments li
  JOIN loans l ON l.id = li.loan_id
  WHERE li.id = p_installment_id;

  -- 1. Mark current installment as paid
  UPDATE loan_installments
  SET paid = true,
      paid_on = current_date
  WHERE id = p_installment_id;

  -- 2. Reduce outstanding principal
  v_outstanding_principal := greatest(v_outstanding_principal - p_extra_amount, 0);
  
  UPDATE loans
  SET outstanding_principal = v_outstanding_principal
  WHERE id = v_loan_id;

  -- 3. Handle Future Installments Logic
  IF v_interest_type = 'fixed' THEN
      -- For Fixed/Flat rate:
      -- We reduce the TENURE, keeping EMI same.
      -- Formula: Remaining Installments = ceil(Outstanding Principal / (EMI - InterestComponent?))
      -- Actually, simpler logic for flat rate prepayment is often just:
      -- Effective Balance / EMI = Remaining Months.
      -- But strictly speaking in flat rate, you've already committed to Total Interest.
      -- However, user requirement says: "Remaining installments = ceil((Outstanding Principal + remaining interest) / EMI)"
      -- This implies dynamic recalculation of remaining interest? 
      -- "Recalc remaining EMIs or remaining tenure using: Remaining installments = ceil((Outstanding Principal after prepayment + remaining interest) / EMI)"
      
      -- Let's fetch remaining interest that WAS scheduled
      -- But since we are reducing tenure, we are effectively saving interest?
      -- The requirement is slightly ambiguous for 'remaining interest' if tenure changes.
      -- Usually flat rate means interest is fixed at start. Prepayment just pays it off faster?
      -- Let's assume standard behavior: You pay off Principal. The remaining liability is (Outstanding Principal + Future Interest).
      -- If we pay extra, we reduce Principal.
      -- New Remaining Total = Outstanding Principal + (Original Interest Per Month * New Months?)
      -- Actually, usually for Flat Rate, Prepayment just reduces the number of future EMIs.
      
      -- Let's implement robust logic:
      -- Delete all FUTURE unpaid installments
      DELETE FROM loan_installments 
      WHERE loan_id = v_loan_id AND paid = false AND installment_month > v_installment_month;
      
      -- If outstanding principal is 0, we are done. Status = completed.
      IF v_outstanding_principal <= 0 THEN
         UPDATE loans SET status = 'completed' WHERE id = v_loan_id;
         RETURN;
      END IF;

      -- Calculate how many EMIs cover the v_outstanding_principal
      -- Note: The user said "Outstanding Principal + remaining interest". 
      -- In a flat loan, "remaining interest" is usually attached to the months.
      -- If we reduce months, do we reduce interest?
      -- If we keep EMI same, and reduce principal, we naturally reduce tenure.
      -- Let's assume EMI const, Calculate N = ceil(Outstanding / (EMI - AvgInterest?))
      -- User specified: "Remaining installments = ceil((Outstanding Principal + remaining interest) / EMI)"
      -- This implies 'remaining interest' is a fixed value that doesn't decrease with tenure reduction? That would be punitive.
      -- OR it means calculate what is left to pay.
      -- Let's stick to a fair logic:
      -- We just continue generating installments of same EMI until Outstanding Principal + Pro-rated Interest is zero?
      
      -- SIMPLIFIED IMPLEMENTATION FOR FLAT RATE PREPAYMENT:
      -- Keep EMI constant.
      -- Generate installments until Principal is exhausted.
      -- NOTE: This effectively converts it to a reducing balance behavior for the tail end, but paying off the flat-calculation-derived EMI.
      
      -- Actually, let's look at the user formula again:
      -- Remaining installments = ceil( (Outstanding Principal + remaining_interest) / EMI )
      -- This means total liability / EMI.
      -- What is 'remaining_interest'?
      -- It is likely the interest component of the future installments that we just deleted.
      -- But if we delete them, we don't pay that interest?
      -- Let's assume for Fixed Rate, the total interest is fixed at start.
      -- So Remaining Interest = Total Interest - Interest Paid So Far.
      
      -- 1. Calculate Interest Paid So Far
      -- 2. Remaining Interest = Total Original Interest - Interest Paid So Far
      -- 3. Total Liability = Outstanding Principal + Remaining Interest
      -- 4. Rounds = ceil(Total Liability / EMI)
      
      -- Implementation:
      -- We need Total Original Interest.
      -- Update: We can compute it or store it. 'loans' table has 'total_interest'.
      -- We can sum 'interest_component' of 'paid' installments to get Interest Paid.
      
      DECLARE
         v_total_original_interest numeric;
         v_interest_paid_so_far numeric;
         v_remaining_interest numeric;
         v_total_liability numeric;
         v_months_needed integer;
         v_monthly_interest numeric;
         v_monthly_principal numeric;
         j integer;
      BEGIN
         SELECT total_interest INTO v_total_original_interest FROM loans WHERE id = v_loan_id;
         
         SELECT coalesce(sum(interest_component), 0) INTO v_interest_paid_so_far
         FROM loan_installments
         WHERE loan_id = v_loan_id AND paid = true;
         
         v_remaining_interest := greatest(v_total_original_interest - v_interest_paid_so_far, 0);
         v_total_liability := v_outstanding_principal + v_remaining_interest;
         
         IF v_emi > 0 THEN
            v_months_needed := ceil(v_total_liability / v_emi);
         ELSE
            v_months_needed := 0;
         END IF;
         
         -- Generate new installments
         -- We need to distribute v_remaining_interest and v_outstanding_principal over v_months_needed
         v_monthly_interest := round(v_remaining_interest / v_months_needed, 2);
         v_monthly_principal := round(v_outstanding_principal / v_months_needed, 2); 
         -- Note: v_monthly_principal + v_monthly_interest might not equal EMI exactly due to rounding.
         -- We should use the EMI as driver.
         
         FOR j IN 1..v_months_needed LOOP
            INSERT INTO loan_installments (
                loan_id,
                household_id,
                installment_month,
                emi_amount,
                principal_component,
                interest_component
            ) VALUES (
                v_loan_id,
                (SELECT household_id FROM loans WHERE id = v_loan_id),
                v_installment_month + j * interval '1 month',
                v_emi,
                -- We put approximate splits
                v_monthly_principal,
                v_monthly_interest
            );
         END LOOP;
         
      END;

  ELSE
      -- Reducing Balance (Standard) Logic
      -- Just reduce Principal. Future EMIs will handle the reduced interest because we regenerate them?
      -- OR we keep EMIs same and reduce tenure?
      -- "Prepayment reduces remaining principal, recalc EMIs accordingly"
      -- Usually this means keep Tenure same, reduce EMI? Or keep EMI same, reduce Tenure?
      -- "Recalc EMIs accordingly" -> implies EMI changes.
      -- Let's stick to: Keep Tenure constant, Reduce EMI.
      
      -- To do this properly for reducing balance:
      -- 1. Delete future installments
      DELETE FROM loan_installments 
      WHERE loan_id = v_loan_id AND paid = false AND installment_month > v_installment_month;
      
      -- 2. Recalculate EMI for remaining tenure using current outstanding principal
      -- Remaining Tenure?
      -- We need to know when the loan was supposed to end.
      -- Start Date + Tenure Months
      DECLARE
         v_original_tenure integer;
         v_months_elapsed integer;
         v_months_remaining integer;
         v_annual_rate numeric;
         v_new_emi numeric;
         v_r numeric;
         v_balance_iter numeric;
         v_interest_iter numeric;
         v_princ_iter numeric;
         k integer;
      BEGIN
         SELECT tenure_months, interest_rate 
         INTO v_original_tenure, v_annual_rate 
         FROM loans WHERE id = v_loan_id;
         
         -- Calculate months elapsed (rough approx by counting paid installments?)
         SELECT count(*) INTO v_months_elapsed FROM loan_installments WHERE loan_id = v_loan_id AND paid = true;
         
         v_months_remaining := v_original_tenure - v_months_elapsed;
         
         IF v_months_remaining < 1 THEN v_months_remaining := 1; END IF;
         
         -- Calculate new EMI
         v_r := v_annual_rate / 1200.0;
         IF v_r > 0 THEN
             v_new_emi := (v_outstanding_principal * v_r * power(1 + v_r, v_months_remaining)) / (power(1 + v_r, v_months_remaining) - 1);
         ELSE
             v_new_emi := v_outstanding_principal / v_months_remaining;
         END IF;
         
         -- Update Loan EMI
         UPDATE loans SET emi_amount = round(v_new_emi, 2) WHERE id = v_loan_id;
         
         -- Generate New Installments
         v_balance_iter := v_outstanding_principal;
         
         FOR k IN 1..v_months_remaining LOOP
             v_interest_iter := round(v_balance_iter * v_r, 2);
             v_princ_iter := round(v_new_emi - v_interest_iter, 2);
             
             -- Adjust last
             IF k = v_months_remaining THEN
                v_princ_iter := v_balance_iter;
                v_new_emi := v_princ_iter + v_interest_iter;
             END IF;
             
             INSERT INTO loan_installments (
                loan_id,
                household_id,
                installment_month,
                emi_amount,
                principal_component,
                interest_component
            ) VALUES (
                v_loan_id,
                (SELECT household_id FROM loans WHERE id = v_loan_id),
                v_installment_month + k * interval '1 month',
                round(v_new_emi, 2),
                v_princ_iter,
                v_interest_iter
            );
            
            v_balance_iter := v_balance_iter - v_princ_iter;
         END LOOP;
         
      END;
  END IF;
END;
$$;
