import assert from "node:assert/strict";
import test from "node:test";
import { selectFeaturedProducts } from "../../src/modules/catalogue/domain/featured-products.ts";

test("selected featured products replace the homepage fallback", () => {
  assert.deepEqual(selectFeaturedProducts(["featured-a", "featured-b"], ["recent-a"]), ["featured-a", "featured-b"]);
});

test("recent products remain visible until an administrator selects features", () => {
  assert.deepEqual(selectFeaturedProducts([], ["recent-a", "recent-b"], 1), ["recent-a"]);
});
