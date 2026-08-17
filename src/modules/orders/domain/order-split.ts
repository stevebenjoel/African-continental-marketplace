export type CheckoutLine = Readonly<{ offerId: string; vendorId: string; quantity: number; unitPriceMinor: bigint }>;
export type VendorOrderDraft = Readonly<{ vendorId: string; subtotalMinor: bigint; lines: readonly CheckoutLine[] }>;

export function splitOrderByVendor(lines: readonly CheckoutLine[]): readonly VendorOrderDraft[] {
  if (lines.length === 0) throw new Error("Checkout must contain at least one line");
  const grouped = new Map<string, CheckoutLine[]>();
  for (const line of lines) {
    if (!line.vendorId || !line.offerId || !Number.isInteger(line.quantity) || line.quantity <= 0 || line.unitPriceMinor < 0n) throw new Error("Invalid checkout line");
    grouped.set(line.vendorId, [...(grouped.get(line.vendorId) ?? []), line]);
  }
  return [...grouped.entries()].map(([vendorId, vendorLines]) => ({
    vendorId,
    lines: vendorLines,
    subtotalMinor: vendorLines.reduce((sum, line) => sum + line.unitPriceMinor * BigInt(line.quantity), 0n)
  }));
}
