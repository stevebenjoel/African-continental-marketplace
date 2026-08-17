import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { splitOrderByVendor } from "../../src/modules/orders/domain/order-split.ts";

describe("multi-vendor order split", () => {
  it("creates exactly one draft per vendor and preserves exact totals", () => {
    const result = splitOrderByVendor([
      { offerId: "offer-a", vendorId: "seller-one", quantity: 2, unitPriceMinor: 1_000n },
      { offerId: "offer-b", vendorId: "seller-two", quantity: 1, unitPriceMinor: 3_000n },
      { offerId: "offer-c", vendorId: "seller-one", quantity: 3, unitPriceMinor: 500n }
    ]);
    assert.equal(result.length, 2);
    assert.equal(result.find((order) => order.vendorId === "seller-one")?.subtotalMinor, 3_500n);
    assert.equal(result.find((order) => order.vendorId === "seller-two")?.subtotalMinor, 3_000n);
  });
});
