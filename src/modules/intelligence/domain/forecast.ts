export function forecastDemand(units30Days: number, recentUnits7Days: number) {
  if (![units30Days, recentUnits7Days].every(Number.isFinite) || units30Days < 0 || recentUnits7Days < 0) throw new Error("Invalid demand history");
  const recentRunRate = recentUnits7Days * (30 / 7), baseline = units30Days;
  const forecastUnits30Days = Math.max(0, Math.round(baseline * 0.4 + recentRunRate * 0.6));
  const trend = recentRunRate > baseline * 1.15 ? "rising" : recentRunRate < baseline * 0.85 ? "falling" : "stable";
  const confidencePercent = Math.min(90, Math.max(25, 25 + Math.round(Math.sqrt(units30Days) * 8)));
  return { forecastUnits30Days, trend, confidencePercent };
}

export function orderRiskScore(input: { totalMinor: number; disputes: number; itemQuantity: number }) {
  let score = 0; const reasons: string[] = [];
  if (input.totalMinor >= 5_000_000) { score += 35; reasons.push("high_order_value"); }
  if (input.totalMinor >= 20_000_000) { score += 25; reasons.push("very_high_order_value"); }
  if (input.disputes >= 2) { score += 30; reasons.push("repeat_disputes"); }
  if (input.itemQuantity >= 100) { score += 20; reasons.push("unusual_quantity"); }
  return { score: Math.min(score, 100), reasons, severity: score >= 70 ? "high" : score >= 40 ? "medium" : "low" };
}
