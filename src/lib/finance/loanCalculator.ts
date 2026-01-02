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

const round = (value: number, decimals = 2) =>
  Number(value.toFixed(decimals));

export function calculateEMI(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): number {
  if (annualInterestRate === 0) {
    return round(principal / tenureMonths);
  }

  const r = annualInterestRate / 12 / 100;

  const emi =
    (principal * r * Math.pow(1 + r, tenureMonths)) /
    (Math.pow(1 + r, tenureMonths) - 1);

  return round(emi);
}

export function calculateTenureMonths(
  principal: number,
  annualInterestRate: number,
  emi: number
): number {
  if (annualInterestRate === 0) {
    return Math.ceil(principal / emi);
  }

  const r = annualInterestRate / 12 / 100;

  const tenure =
    Math.log(emi / (emi - principal * r)) / Math.log(1 + r);

  return Math.ceil(tenure);
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
  }

  const totalPayable = round(calculatedEMI * calculatedTenure);
  const totalInterest = round(totalPayable - principal);

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

  for (let month = 1; month <= tenureMonths; month++) {
    const interestComponent = round(outstanding * r);
    const principalComponent = round(emi - interestComponent);

    outstanding = round(outstanding - principalComponent);

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

export function recalcEmiAfterPrepayment(
  outstandingPrincipal: number,
  annualRate: number,
  tenureMonthsRemaining: number
): number {
  if (annualRate === 0) {
    return round(outstandingPrincipal / tenureMonthsRemaining);
  }

  const r = annualRate / 12 / 100;

  const emi =
    (outstandingPrincipal * r * Math.pow(1 + r, tenureMonthsRemaining)) /
    (Math.pow(1 + r, tenureMonthsRemaining) - 1);

  return round(emi);
}

export function recalcTenureAfterPrepayment(
  outstandingPrincipal: number,
  annualRate: number,
  emi: number
): number {
  if (annualRate === 0) {
    return Math.ceil(outstandingPrincipal / emi);
  }

  const r = annualRate / 12 / 100;

  const tenure =
    Math.log(emi / (emi - outstandingPrincipal * r)) /
    Math.log(1 + r);

  return Math.ceil(tenure);
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
    newTenure = recalcTenureAfterPrepayment(
      newPrincipal,
      annualRate,
      currentEmi
    );
  }

  const newTotalInterest =
    newEmi * newTenure - newPrincipal;

  return {
    newEmi,
    newTenureMonths: newTenure,
    totalInterestSaved: round(
      originalTotalInterest - newTotalInterest
    )
  };
}
