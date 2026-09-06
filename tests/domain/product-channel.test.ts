import test from "node:test";
import assert from "node:assert/strict";
import { isGlobalStoreProduct } from "../../src/modules/catalogue/domain/product-channel.ts";

test("identifies only the protected PAC-SM global catalogue channel", () => {
  assert.equal(isGlobalStoreProduct({ specifications: JSON.stringify({ channel: "pacsm_global" }) }), true);
  assert.equal(isGlobalStoreProduct({ specifications: JSON.stringify({ channel: "retail" }) }), false);
  assert.equal(isGlobalStoreProduct({ specifications: "not-json" }), false);
  assert.equal(isGlobalStoreProduct(null), false);
});
