import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculatePayable } from "../../src/modules/finance/domain/payable.ts";
describe("vendor payable balance", () => { it("nets sales, refunds and settlements", () => { assert.equal(calculatePayable([{ direction: "credit", amountMinor: 9000 }, { direction: "debit", amountMinor: 2500 }, { direction: "debit", amountMinor: 1500 }]), 5000); }); });
