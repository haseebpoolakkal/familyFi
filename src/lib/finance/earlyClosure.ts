export interface EarlyClosureResult {
  closureAmount: number;
  interestSaved: number;
}

export function calculateEarlyClosure(
  outstandingPrincipal: number,
  remainingInterest: number,
  foreclosureFeePercent = 0
): EarlyClosureResult {
  const foreclosureFee =
    (outstandingPrincipal * foreclosureFeePercent) / 100;

  return {
    closureAmount: Number(
      (outstandingPrincipal + foreclosureFee).toFixed(2)
    ),
    interestSaved: Number(remainingInterest.toFixed(2))
  };
}
