import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertNegotiationAction, negotiationTurn, validateNegotiatedPrice } from "../../src/modules/wholesale/domain/negotiation.ts";

describe("wholesale price negotiation", () => {
  it("enforces alternating buyer and seller turns", () => {
    assert.equal(negotiationTurn("submitted"), "seller");
    assert.equal(negotiationTurn("seller_countered"), "buyer");
    assert.doesNotThrow(() => assertNegotiationAction("submitted", "seller", "accept"));
    assert.throws(() => assertNegotiationAction("submitted", "buyer", "accept"));
  });

  it("enforces seller price and discount controls", () => {
    assert.deepEqual(validateNegotiatedPrice({ unitPriceMinor: 850, quantity: 100, regularUnitPriceMinor: 1000, minimumQuantity: 50, floorUnitPriceMinor: 800, maximumDiscountBasisPoints: 2000 }), { discountBasisPoints: 1500, totalMinor: 85000 });
    assert.throws(() => validateNegotiatedPrice({ unitPriceMinor: 700, quantity: 100, regularUnitPriceMinor: 1000, minimumQuantity: 50, floorUnitPriceMinor: 800 }));
    assert.throws(() => validateNegotiatedPrice({ unitPriceMinor: 850, quantity: 10, regularUnitPriceMinor: 1000, minimumQuantity: 50 }));
  });
});
