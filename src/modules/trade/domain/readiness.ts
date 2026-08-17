export type TradeReadinessInput = {
  exporterNumber?: string;
  targetCountries: string[];
  productCategories: string[];
  incoterms: string[];
  transportModes: string[];
  certificationCount: number;
  documentCount: number;
};

export function calculateTradeReadiness(input: TradeReadinessInput) {
  let score = 0;
  if (input.exporterNumber?.trim()) score += 20;
  if (input.targetCountries.length) score += 15;
  if (input.productCategories.length) score += 15;
  if (input.incoterms.length) score += 10;
  if (input.transportModes.length) score += 10;
  score += Math.min(input.certificationCount * 10, 20);
  score += Math.min(input.documentCount * 5, 10);
  return Math.min(score, 100);
}

export const TRADE_PASSPORT_ACTIONS = ["approve", "reject", "request_information"] as const;
export type TradePassportAction = typeof TRADE_PASSPORT_ACTIONS[number];
export function isTradePassportAction(value: string): value is TradePassportAction {
  return (TRADE_PASSPORT_ACTIONS as readonly string[]).includes(value);
}
