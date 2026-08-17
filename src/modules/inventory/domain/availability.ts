export type InventoryPosition = Readonly<{ onHand: number; reserved: number; damaged: number }>;

export function availableQuantity(position: InventoryPosition): number {
  for (const value of Object.values(position)) if (!Number.isInteger(value) || value < 0) throw new Error("Inventory quantities must be non-negative integers");
  const available = position.onHand - position.reserved - position.damaged;
  if (available < 0) throw new Error("Inventory position violates availability invariant");
  return available;
}

export function canReserve(position: InventoryPosition, requested: number): boolean {
  if (!Number.isInteger(requested) || requested <= 0) return false;
  return availableQuantity(position) >= requested;
}
