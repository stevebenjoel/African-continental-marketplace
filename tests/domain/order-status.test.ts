import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canTransitionVendorOrder } from "../../src/modules/orders/domain/status.ts";

describe("vendor fulfilment state machine", () => {
  it("allows only the forward fulfilment sequence", () => {
    assert.equal(canTransitionVendorOrder("new", "processing"), true);
    assert.equal(canTransitionVendorOrder("processing", "packed"), true);
    assert.equal(canTransitionVendorOrder("packed", "dispatched"), true);
    assert.equal(canTransitionVendorOrder("dispatched", "delivered"), true);
  });
  it("rejects skips, repeats and backwards transitions", () => {
    assert.equal(canTransitionVendorOrder("new", "dispatched"), false);
    assert.equal(canTransitionVendorOrder("packed", "processing"), false);
    assert.equal(canTransitionVendorOrder("delivered", "delivered"), false);
  });
});
