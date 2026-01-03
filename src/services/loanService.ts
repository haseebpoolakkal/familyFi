import { createClient } from '@/lib/supabase/client';
import { calculateLoanSummary } from '@/lib/finance/loanCalculator';

export type Loan = {
    id: string;
    household_id: string;
    lender_name: string;
    loan_type: string | null;
    principal_amount: number;
    interest_rate: number;
    tenure_months: number;
    emi_amount: number;
    start_date: string;
    total_interest: number;
    total_payable: number;
    outstanding_principal: number;
    status: 'active' | 'completed' | 'closed_early';
    interest_type?: 'reducing' | 'fixed';
};

export type LoanInstallment = {
    id: string;
    loan_id: string;
    installment_month: string;
    emi_amount: number;
    principal_component: number;
    interest_component: number;
    paid: boolean;
    paid_on: string | null;
};


export interface CreateLoanInput {
    lenderName: string;
    loanType?: string;
    principalAmount: number;
    interestRate: number;
    startDate: string;
    tenureMonths?: number;
    emiAmount?: number;
    interestType: 'reducing' | 'fixed';
    householdId: string;
}

export async function createLoan(input: CreateLoanInput) {
    const supabase = createClient();

    const summary = calculateLoanSummary({
        principal: input.principalAmount,
        annualInterestRate: input.interestRate,
        tenureMonths: input.tenureMonths,
        emi: input.emiAmount,
    });

    const {
        emi,
        tenureMonths: tenure,
        totalPayable,
        totalInterest,
    } = summary;

    const { data, error } = await supabase
        .from('loans')
        .insert({
            household_id: input.householdId,
            lender_name: input.lenderName,
            loan_type: input.loanType,
            principal_amount: input.principalAmount,
            interest_rate: input.interestRate,
            tenure_months: input.tenureMonths ?? tenure,
            emi_amount: input.emiAmount ?? emi,
            start_date: input.startDate,
            calculated_emi: emi,
            calculated_tenure: tenure,
            total_payable: totalPayable,
            total_interest: totalInterest,
            outstanding_principal: input.principalAmount,
            interest_type: input.interestType,
        })
        .select()
        .maybeSingle();

    if (error) throw error;

    if (data) {
        await generateLoanSchedule(data.id);
    }

    return data;
}


export async function generateLoanSchedule(loanId: string) {
    const supabase = createClient();
    const { error } = await supabase.rpc('generate_loan_installments', {
        p_loan_id: loanId,
    });
    if (error) throw error;
}

export async function closeLoanEarly(loanId: string) {
    const supabase = createClient();

    const { error } = await supabase.rpc('close_loan_early', {
        p_loan_id: loanId,
    });

    if (error) throw error;
}


export async function deleteLoan(loanId: string) {
    const supabase = createClient();
    const { error } = await supabase.from('loans').delete().eq('id', loanId);
    if (error) throw error;
}

export async function updateLoan(loanId: string, input: Partial<CreateLoanInput>) {
    const supabase = createClient();

    // 1. Fetch existing loan to check for payments
    const { data: installments } = await supabase
        .from('loan_installments')
        .select('paid')
        .eq('loan_id', loanId)
        .eq('paid', true);

    const hasPayments = installments && installments.length > 0;

    // 2. Determine what's being updated
    const isFinancialUpdate =
        input.principalAmount !== undefined ||
        input.interestRate !== undefined ||
        input.tenureMonths !== undefined ||
        input.startDate !== undefined;

    if (isFinancialUpdate && hasPayments) {
        throw new Error('Cannot edit financial details of a loan that has payments');
    }

    // 3. Prepare update payload
    const updates: Record<string, string | number | null> = {};
    if (input.lenderName) updates.lender_name = input.lenderName;
    if (input.loanType) updates.loan_type = input.loanType;

    // 4. Handle Financial Update (Re-amortization)
    if (isFinancialUpdate) {
        const { data: currentLoan } = await supabase.from('loans').select('*').eq('id', loanId).single();
        if (!currentLoan) throw new Error('Loan not found');

        const type = (input.interestType as 'reducing' | 'fixed') ?? currentLoan.interest_type ?? 'reducing';
        const p = input.principalAmount ?? currentLoan.principal_amount;
        const r = input.interestRate ?? currentLoan.interest_rate;
        const t = input.tenureMonths ?? currentLoan.tenure_months;

        // Re-calculate
        const summary = calculateLoanSummary({
            principal: p,
            annualInterestRate: r,
            tenureMonths: t,
            // emi: undefined // Calculate fresh EMI based on new parameters
        });

        const { emi, tenureMonths: tenure, totalPayable, totalInterest } = summary;

        updates.principal_amount = p;
        updates.interest_rate = r;
        updates.tenure_months = t;
        updates.emi_amount = emi;
        updates.calculated_emi = emi;
        updates.calculated_tenure = tenure;
        updates.total_payable = totalPayable;
        updates.total_interest = totalInterest;
        updates.start_date = input.startDate ?? currentLoan.start_date;
        updates.outstanding_principal = p; // Reset outstanding to new principal since no payments exist
        updates.interest_type = type;
    }

    // 5. Update Loan Record
    const { error } = await supabase.from('loans').update(updates).eq('id', loanId);
    if (error) throw error;

    // 6. Regenerate Schedule (if financial update)
    if (isFinancialUpdate) {
        // Delete old installments
        await supabase.from('loan_installments').delete().eq('loan_id', loanId);
        // Generate new ones
        await generateLoanSchedule(loanId);
    }
}

export async function getLoans(): Promise<Loan[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('loans')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}


export async function getLoanInstallments(
    householdId: string,
    startDate: string,
    endDate: string
): Promise<LoanInstallment[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('loan_installments')
        .select('*')
        .eq('household_id', householdId)
        .gte('installment_month', startDate)
        .lte('installment_month', endDate);

    if (error) throw error;
    return data;
}

export async function recordLoanPayment(
    loanId: string,
    amount: number
) {
    const supabase = createClient();
    // Get next unpaid installment
    const { data: installment, error } = await supabase
        .from('loan_installments')
        .select('*')
        .eq('loan_id', loanId)
        .eq('paid', false)
        .order('installment_month', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error || !installment) {
        throw new Error('No unpaid installment found');
    }

    // Normal EMI payment
    if (amount <= installment.emi_amount) {
        await supabase
            .from('loan_installments')
            .update({
                paid: true,
                paid_on: new Date().toISOString(),
            })
            .eq('id', installment.id);

        return;
    }

    // Prepayment / foreclosure
    const excess = amount - installment.emi_amount;

    await supabase.rpc('apply_loan_prepayment', {
        p_installment_id: installment.id,
        p_extra_amount: excess,
    });
}

export async function getLoanSchedule(loanId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('loan_installments')
        .select(`
      id,
      installment_month,
      emi_amount,
      principal_component,
      interest_component,
      paid
    `)
        .eq('loan_id', loanId)
        .order('installment_month', { ascending: true });

    if (error) throw error;

    return data.map(row => ({
        ...row,
        month: new Date(row.installment_month).toLocaleDateString('en-IN', {
            month: 'short',
            year: 'numeric',
        }),
    }));
}
