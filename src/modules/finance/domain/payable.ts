export type PayableLine = Readonly<{ direction: "debit" | "credit"; amountMinor: number }>;
export function calculatePayable(lines: readonly PayableLine[]): number {
  const balance = lines.reduce((sum, line) => sum + (line.direction === "credit" ? line.amountMinor : -line.amountMinor), 0);
  if (!Number.isSafeInteger(balance)) throw new Error("Invalid payable balance");
  return balance;
}
