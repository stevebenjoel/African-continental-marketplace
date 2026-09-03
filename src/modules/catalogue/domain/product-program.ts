export type PurchaseType = "standard" | "preorder" | "white_label";

export function preorderIsOpen(program: Record<string, unknown>, at = new Date()) {
  if (!program.preorderEnabled) return false;
  const time = at.getTime(), opens = program.preorderOpensAt ? new Date(String(program.preorderOpensAt)).getTime() : null, closes = program.preorderClosesAt ? new Date(String(program.preorderClosesAt)).getTime() : null;
  return (!opens || opens <= time) && (!closes || closes >= time) && Number(program.preorderReserved ?? 0) < Number(program.preorderCapacity ?? 0);
}

export function validateProgramInput(input: { preorderEnabled: boolean; preorderOpensAt?: string; preorderClosesAt?: string; estimatedDispatchAt?: string; preorderCapacity?: number; whiteLabelEnabled: boolean; whiteLabelMinimumQuantity?: number; whiteLabelLeadDays?: number; whiteLabelOptions?: string }) {
  if (input.preorderEnabled) {
    if (!input.estimatedDispatchAt || !Number.isSafeInteger(input.preorderCapacity) || Number(input.preorderCapacity) < 1) throw new Error("Pre-order dispatch date and capacity are required");
    if (input.preorderOpensAt && input.preorderClosesAt && new Date(input.preorderOpensAt) >= new Date(input.preorderClosesAt)) throw new Error("Pre-order closing time must follow opening time");
    if (input.preorderClosesAt && new Date(input.preorderClosesAt) >= new Date(input.estimatedDispatchAt)) throw new Error("Dispatch must follow the order window");
  }
  if (input.whiteLabelEnabled && (!Number.isSafeInteger(input.whiteLabelMinimumQuantity) || Number(input.whiteLabelMinimumQuantity) < 1 || !Number.isSafeInteger(input.whiteLabelLeadDays) || Number(input.whiteLabelLeadDays) < 1 || !input.whiteLabelOptions?.trim())) throw new Error("White-label MOQ, lead time and options are required");
}
