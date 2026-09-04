export type PurchaseQuantityLimits = Readonly<{
  minimum: number;
  maximum: number;
  purchasable: boolean;
}>;

export function purchaseQuantityLimits(input: {
  available: number;
  minimumOrderQuantity: number;
  maximumOrderQuantity?: number | null;
}): PurchaseQuantityLimits {
  const minimum = Math.max(1, Math.trunc(input.minimumOrderQuantity));
  const stockMaximum = Math.max(0, Math.trunc(input.available));
  const sellerMaximum = input.maximumOrderQuantity == null
    ? Number.MAX_SAFE_INTEGER
    : Math.max(0, Math.trunc(input.maximumOrderQuantity));
  const maximum = Math.min(stockMaximum, sellerMaximum);
  return { minimum, maximum, purchasable: maximum >= minimum };
}
