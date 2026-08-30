export const COMMISSION_BASIS_POINTS = 10_000;

export type CommissionAmounts = Readonly<{
  grossMinor: number;
  discountMinor: number;
  commissionBaseMinor: number;
  pacsmMinor: number;
  vendorMinor: number;
}>;

export function calculateCommission(grossMinor: number, discountMinor: number, rateBasisPoints: number): CommissionAmounts {
  if (![grossMinor, discountMinor, rateBasisPoints].every(Number.isSafeInteger)) throw new Error("Commission values must be integers");
  if (grossMinor < 0 || discountMinor < 0 || discountMinor > grossMinor) throw new Error("Invalid commission base");
  if (rateBasisPoints < 0 || rateBasisPoints > COMMISSION_BASIS_POINTS) throw new Error("Commission rate must be between 0% and 100%");
  const commissionBaseMinor = grossMinor - discountMinor;
  const pacsmMinor = Math.round(commissionBaseMinor * rateBasisPoints / COMMISSION_BASIS_POINTS);
  return { grossMinor, discountMinor, commissionBaseMinor, pacsmMinor, vendorMinor: commissionBaseMinor - pacsmMinor };
}

export function vendorRateBasisPoints(pacsmRateBasisPoints: number) {
  if (!Number.isSafeInteger(pacsmRateBasisPoints) || pacsmRateBasisPoints < 0 || pacsmRateBasisPoints > COMMISSION_BASIS_POINTS) throw new Error("Invalid PAC-SM rate");
  return COMMISSION_BASIS_POINTS - pacsmRateBasisPoints;
}
