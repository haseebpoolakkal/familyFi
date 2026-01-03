export interface LoanInput {
    principal: number;
    annualInterestRate: number; // in %
    tenureMonths?: number; // optional
    emi?: number; // optional
}

export interface LoanSummary {
    emi: number;
    tenureMonths: number;
    totalPayable: number;
    totalInterest: number;
}

export interface AmortizationRow {
    month: number;
    emi: number;
    principalComponent: number;
    interestComponent: number;
    outstandingPrincipal: number;
}

export interface LoanRecalculationResult {
    newEmi: number;
    newTenureMonths: number;
    totalInterestSaved: number;
}

// Rule 5: Rounding consistency. 
// - EMI is rounded to nearest Integer (Rule 1).
// - Currency values (interest, principal portions) are rounded to 2 decimals.
const roundCurrency = (value: number) => Math.round(value * 100) / 100;
const roundEMI = (value: number) => Math.round(value);

/**
 * Rule 1: EMI Calculation (Reducing Balance)
 * EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 * Rounded to nearest rupee.
 */
export function calculateEMI(
    principal: number,
    annualInterestRate: number,
    tenureMonths: number
): number {
    if (annualInterestRate === 0) {
        return roundEMI(principal / tenureMonths);
    }

    const r = annualInterestRate / 12 / 100;

    const emi =
        (principal * r * Math.pow(1 + r, tenureMonths)) /
        (Math.pow(1 + r, tenureMonths) - 1);

    return roundEMI(emi);
}

/**
 * Rule 4: Tenure Recalculation Algorithm
 * - Use a loop while outstandingPrincipal > 0
 * - Interest calculated monthly on outstanding balance
 */
export function calculateTenureMonths(
    principal: number,
    annualInterestRate: number,
    emi: number
): number {
    // Edge Case: EMI must be > monthly interest (simplified check for first month)
    const monthlyInterest = roundCurrency(principal * (annualInterestRate / 12 / 100));
    if (emi <= monthlyInterest) {
        // In reality, this implies infinite tenure.
        // However, to prevent infinite loops, return a safe high number or throw.
        // For production safety:
        if (annualInterestRate > 0) return 999;
    }

    if (annualInterestRate === 0) {
        return Math.ceil(principal / emi);
    }

    let balance = principal;
    let months = 0;
    const r = annualInterestRate / 12 / 100;

    // Loop limit 50 years to prevent infinite loops
    while (balance > 0 && months <= 600) {
        const interest = roundCurrency(balance * r);
        const principalPaid = roundCurrency(emi - interest);

        // If principalPaid <= 0 despite EMI > initial interest (e.g. slight fluctuations), 
        // it implies the EMI isn't covering interest.
        if (principalPaid <= 0) {
            months = 999;
            break;
        }

        balance = roundCurrency(balance - principalPaid);
        months++;
    }

    return months;
}

export function calculateLoanSummary(input: LoanInput): LoanSummary {
    const { principal, annualInterestRate, tenureMonths, emi } = input;

    if (!tenureMonths && !emi) {
        throw new Error("Either tenureMonths or emi must be provided");
    }

    let calculatedEMI = emi!;
    let calculatedTenure = tenureMonths!;

    if (tenureMonths) {
        calculatedEMI = calculateEMI(
            principal,
            annualInterestRate,
            tenureMonths
        );
    } else if (emi) {
        calculatedTenure = calculateTenureMonths(
            principal,
            annualInterestRate,
            emi
        );
        // If calculated tenure is effectively infinite/invalid (due to low EMI), re-check?
        // The UI handles validation, logic simply returns values.
    }

    // Recalculate strict total payable based on the schedule loop to be precise
    // (Simply EMI * Tenure is an approximation because last EMI might be smaller)
    // But for summary purposes, EMI * Tenure is standard display expectation.
    const totalPayable = roundCurrency(calculatedEMI * calculatedTenure);
    const totalInterest = roundCurrency(totalPayable - principal);

    return {
        emi: calculatedEMI,
        tenureMonths: calculatedTenure,
        totalPayable,
        totalInterest
    };
}

export function generateAmortizationSchedule(
    principal: number,
    annualInterestRate: number,
    emi: number,
    tenureMonths: number
): AmortizationRow[] {
    const schedule: AmortizationRow[] = [];
    let outstanding = principal;
    const r = annualInterestRate / 12 / 100;

    // We loop until tenure OR balance is zero, to handle rounding adjustments.
    // Using explicit loop instead of fixed for-loop helps with exact closure.

    for (let month = 1; month <= tenureMonths + 12; month++) { // buffer for rounding
        if (outstanding <= 0) break;

        const interestComponent = roundCurrency(outstanding * r);
        // Standard rule: Principal paid = EMI - Interest
        let principalComponent = roundCurrency(emi - interestComponent);

        // Last EMI Adjustment Rule
        if (outstanding < principalComponent) {
            principalComponent = outstanding;
            // The actual EMI paid this month is principal + interest
            // But for the schedule row, we often list the 'emi' column as constant 
            // or show the actual payment. Let's keep EMI constant but track strict principal.
            // outstanding becomes 0.
        }

        outstanding = roundCurrency(outstanding - principalComponent);

        schedule.push({
            month,
            emi,
            principalComponent,
            interestComponent,
            outstandingPrincipal: Math.max(outstanding, 0)
        });
    }

    return schedule;
}

// Re-implemented to mirror calculateEMI logic but for remaining tenure
export function recalcEmiAfterPrepayment(
    outstandingPrincipal: number,
    annualRate: number,
    tenureMonthsRemaining: number
): number {
    return calculateEMI(outstandingPrincipal, annualRate, tenureMonthsRemaining);
}

// Re-implemented to use the Loop Algorithm via calculateTenureMonths
export function recalcTenureAfterPrepayment(
    outstandingPrincipal: number,
    annualRate: number,
    emi: number
): number {
    return calculateTenureMonths(outstandingPrincipal, annualRate, emi);
}

export type PrepaymentStrategy = 'reduce_emi' | 'reduce_tenure';

export function applyPrepayment(
    params: {
        outstandingPrincipal: number;
        annualRate: number;
        currentEmi: number;
        remainingTenure: number;
        prepaymentAmount: number;
        strategy: PrepaymentStrategy;
        originalTotalInterest: number;
    }
): LoanRecalculationResult {
    const {
        outstandingPrincipal,
        annualRate,
        currentEmi,
        remainingTenure,
        prepaymentAmount,
        strategy,
        originalTotalInterest
    } = params;

    const newPrincipal = outstandingPrincipal - prepaymentAmount;

    if (newPrincipal <= 0) {
        return {
            newEmi: 0,
            newTenureMonths: 0,
            totalInterestSaved: originalTotalInterest
        };
    }

    let newEmi = currentEmi;
    let newTenure = remainingTenure;

    if (strategy === 'reduce_emi') {
        newEmi = recalcEmiAfterPrepayment(
            newPrincipal,
            annualRate,
            remainingTenure
        );
    } else {
        // Rule 3: "Prepayment reduces principal... EMI MUST remain unchanged... Remaining tenure Recalculated"
        newTenure = recalcTenureAfterPrepayment(
            newPrincipal,
            annualRate,
            currentEmi
        );
    }

    // Calculate new total interest by simulating the remaining schedule
    // New Total Interest = (Sum of all future interest payments)
    // Or roughly: (NewEMI * NewTenure) - NewPrincipal
    // For precision, loop simulation is best, but for quick summary:
    const newTotalPayable = newEmi * newTenure;
    const newTotalInterest = newTotalPayable - newPrincipal;

    return {
        newEmi,
        newTenureMonths: newTenure,
        totalInterestSaved: roundCurrency(
            originalTotalInterest - newTotalInterest
        )
    };
}
