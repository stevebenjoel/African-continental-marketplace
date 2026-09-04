import assert from "node:assert/strict";
import test from "node:test";
import { purchaseQuantityLimits } from "../../src/modules/cart/domain/purchase-quantity.ts";

test("retail quantity is bounded by stock and seller limits", () => {
  assert.deepEqual(purchaseQuantityLimits({ available: 120, minimumOrderQuantity: 1, maximumOrderQuantity: 20 }), { minimum: 1, maximum: 20, purchasable: true });
  assert.deepEqual(purchaseQuantityLimits({ available: 4, minimumOrderQuantity: 2 }), { minimum: 2, maximum: 4, purchasable: true });
});

test("standard purchase remains unavailable without confirmed stock", () => {
  assert.deepEqual(purchaseQuantityLimits({ available: 0, minimumOrderQuantity: 1, maximumOrderQuantity: 20 }), { minimum: 1, maximum: 0, purchasable: false });
});
