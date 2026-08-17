export const vendorOrderTransitions = {
  new: ["processing"],
  processing: ["packed"],
  packed: ["dispatched"],
  dispatched: ["delivered"]
} as const;

export type VendorOrderStatus = keyof typeof vendorOrderTransitions | "delivered" | "cancelled";

export function canTransitionVendorOrder(current: string, next: string): boolean {
  return (vendorOrderTransitions[current as keyof typeof vendorOrderTransitions] as readonly string[] | undefined)?.includes(next) ?? false;
}
