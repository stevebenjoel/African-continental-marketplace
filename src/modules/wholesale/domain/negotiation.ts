export const negotiationStatuses = ["submitted", "seller_countered", "buyer_countered", "accepted", "rejected", "withdrawn", "expired", "converted_to_order", "cancelled"] as const;
export type NegotiationStatus = (typeof negotiationStatuses)[number];
export type NegotiationActor = "buyer" | "seller";
export type NegotiationAction = "accept" | "reject" | "counter" | "withdraw";

const platformVendorIds = new Set(["pacsm-demo-vendor", "pacsm-platform"]);
export function canSuperAdminRespondForVendor(vendorId: string) { return platformVendorIds.has(vendorId); }

export function negotiationTurn(status: NegotiationStatus): NegotiationActor | null {
  if (status === "submitted" || status === "buyer_countered") return "seller";
  if (status === "seller_countered") return "buyer";
  return null;
}

export function assertNegotiationAction(status: NegotiationStatus, actor: NegotiationActor, action: NegotiationAction) {
  if (action === "withdraw") {
    if (actor !== "buyer" || !["submitted", "seller_countered", "buyer_countered"].includes(status)) throw new Error("Negotiation cannot be withdrawn");
    return;
  }
  if (negotiationTurn(status) !== actor) throw new Error("It is not your turn to respond");
}

export function validateNegotiatedPrice(input: { unitPriceMinor: number; quantity: number; regularUnitPriceMinor: number; minimumQuantity: number; floorUnitPriceMinor?: number; maximumDiscountBasisPoints?: number }) {
  if (!Number.isSafeInteger(input.unitPriceMinor) || input.unitPriceMinor < 1) throw new Error("Invalid unit price");
  if (!Number.isSafeInteger(input.quantity) || input.quantity < input.minimumQuantity) throw new Error("Invalid wholesale quantity");
  const discountBasisPoints = Math.floor(((input.regularUnitPriceMinor - input.unitPriceMinor) * 10_000) / input.regularUnitPriceMinor);
  if (input.floorUnitPriceMinor && input.unitPriceMinor < input.floorUnitPriceMinor) throw new Error("Price is below the seller limit");
  if (input.maximumDiscountBasisPoints && discountBasisPoints > input.maximumDiscountBasisPoints) throw new Error("Discount exceeds the seller limit");
  return { discountBasisPoints: Math.max(0, discountBasisPoints), totalMinor: input.unitPriceMinor * input.quantity };
}

export function isAcceptedNegotiationUsable(status: string, expiresAt: string, usedAt?: unknown) {
  return status === "accepted" && !usedAt && new Date(expiresAt).getTime() > Date.now();
}
