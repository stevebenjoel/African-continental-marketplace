import assert from "node:assert/strict";
import test from "node:test";
import { buildBulkProductTemplate, BULK_PRODUCT_COLUMNS, parseBulkProductsCsv } from "../../src/modules/catalogue/domain/bulk-products.ts";

test("demo bulk CSV follows the accepted schema and produces two products", () => {
  const csv = buildBulkProductTemplate(), result = parseBulkProductsCsv(csv, new Set(["health", "electronics"]));
  assert.equal(csv.split("\r\n")[0], BULK_PRODUCT_COLUMNS.join(","));
  assert.equal(result.errors.length, 0);
  assert.equal(result.products.length, 2);
  assert.equal(result.products[0].retailPriceMinor, 650000);
});

test("bulk CSV reports row-specific validation errors without returning products", () => {
  const csv = buildBulkProductTemplate().replace("example-shea-body-butter", "Bad Slug").replace("health", "missing-category"), result = parseBulkProductsCsv(csv, new Set(["health", "electronics"]));
  assert.equal(result.products.length, 0);
  assert.ok(result.errors.some(error => error.row === 2 && error.field === "slug"));
  assert.ok(result.errors.some(error => error.row === 2 && error.field === "category_id"));
});

test("bulk CSV rejects duplicate seller SKUs before Appwrite writes", () => {
  const csv = buildBulkProductTemplate().replace("DEMO-SOLAR-100", "DEMO-SHEA-250"), result = parseBulkProductsCsv(csv, new Set(["health", "electronics"]));
  assert.equal(result.products.length, 0);
  assert.ok(result.errors.some(error => error.row === 3 && error.field === "sku"));
});
