export type JournalLine = Readonly<{ accountId: string; direction: "debit" | "credit"; amountMinor: bigint; currencyCode: string }>;

export function assertBalancedJournal(lines: readonly JournalLine[]): void {
  if (lines.length < 2) throw new Error("A journal requires at least two lines");
  const currencies = new Set(lines.map((line) => line.currencyCode));
  if (currencies.size !== 1) throw new Error("A journal entry cannot mix currencies");
  if (lines.some((line) => line.amountMinor <= 0n)) throw new Error("Journal amounts must be positive");
  const debit = lines.filter((line) => line.direction === "debit").reduce((sum, line) => sum + line.amountMinor, 0n);
  const credit = lines.filter((line) => line.direction === "credit").reduce((sum, line) => sum + line.amountMinor, 0n);
  if (debit !== credit) throw new Error("Journal entry is not balanced");
}
