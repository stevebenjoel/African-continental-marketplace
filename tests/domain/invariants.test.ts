import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertBalancedJournal } from "../../src/modules/accounting/domain/journal.ts";
import { availableQuantity, canReserve } from "../../src/modules/inventory/domain/availability.ts";

describe("financial and inventory invariants", () => {
  it("rejects unbalanced journals", () => assert.throws(() => assertBalancedJournal([
    { accountId: "cash", direction: "debit", amountMinor: 100n, currencyCode: "NGN" },
    { accountId: "vendor", direction: "credit", amountMinor: 90n, currencyCode: "NGN" }
  ]), /not balanced/));

  it("derives availability and prevents excess reservation", () => {
    const stock = { onHand: 10, reserved: 3, damaged: 1 };
    assert.equal(availableQuantity(stock), 6);
    assert.equal(canReserve(stock, 7), false);
  });
});
