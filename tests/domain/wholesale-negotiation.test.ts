import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertNegotiationAction, canSuperAdminRespondForVendor, negotiationErrorCode, negotiationTurn, validateNegotiatedPrice } from "../../src/modules/wholesale/domain/negotiation.ts";

describe("wholesale price negotiation", () => {
  it("enforces alternating buyer and seller turns", () => {
    assert.equal(negotiationTurn("submitted"), "seller");
    assert.equal(negotiationTurn("seller_countered"), "buyer");
    assert.doesNotThrow(() => assertNegotiationAction("submitted", "seller", "accept"));
    assert.throws(() => assertNegotiationAction("submitted", "buyer", "accept"));
    assert.doesNotThrow(() => assertNegotiationAction("seller_countered", "buyer", "accept"));
    assert.doesNotThrow(() => assertNegotiationAction("seller_countered", "buyer", "reject"));
    assert.doesNotThrow(() => assertNegotiationAction("seller_countered", "buyer", "counter"));
    assert.doesNotThrow(() => assertNegotiationAction("buyer_countered", "seller", "accept"));
    assert.doesNotThrow(() => assertNegotiationAction("buyer_countered", "seller", "reject"));
    assert.doesNotThrow(() => assertNegotiationAction("buyer_countered", "seller", "counter"));
    assert.throws(() => assertNegotiationAction("accepted", "seller", "counter"));
  });

  it("returns safe actionable error codes", () => {
    try { assertNegotiationAction("seller_countered", "seller", "accept"); }
    catch (error) { assert.equal(negotiationErrorCode(error), "not_your_turn"); }
    assert.equal(negotiationErrorCode(new Error("database detail")), "unavailable");
  });

  it("enforces seller price and discount controls", () => {
    assert.deepEqual(validateNegotiatedPrice({ unitPriceMinor: 850, quantity: 100, regularUnitPriceMinor: 1000, minimumQuantity: 50, floorUnitPriceMinor: 800, maximumDiscountBasisPoints: 2000 }), { discountBasisPoints: 1500, totalMinor: 85000 });
    assert.throws(() => validateNegotiatedPrice({ unitPriceMinor: 700, quantity: 100, regularUnitPriceMinor: 1000, minimumQuantity: 50, floorUnitPriceMinor: 800 }));
    assert.throws(() => validateNegotiatedPrice({ unitPriceMinor: 850, quantity: 10, regularUnitPriceMinor: 1000, minimumQuantity: 50 }));
  });

  it("limits Super Admin proxy responses to PAC-SM inventory", () => {
    assert.equal(canSuperAdminRespondForVendor("pacsm-demo-vendor"), true);
    assert.equal(canSuperAdminRespondForVendor("pacsm-platform"), true);
    assert.equal(canSuperAdminRespondForVendor("independent-vendor"), false);
  });
});
