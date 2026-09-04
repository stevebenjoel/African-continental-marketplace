import assert from "node:assert/strict";
import test from "node:test";
import { buildBulkStockTemplate, parseBulkStockCsv } from "../../src/modules/inventory/domain/bulk-stock.ts";

test("seller stock template preserves recognizable product names and SKUs", () => {
  const template = buildBulkStockTemplate([{ name: "LG Television, 55 inch", sellerSku: "DIP-LG-55" }]);
  assert.match(template, /product_name,seller_sku,quantity_received/);
  assert.match(template, /DIP-LG-55/);
  assert.deepEqual(parseBulkStockCsv(template.replace('""\r\n', '"7"\r\n')).rows[0], { row: 2, sellerSku: "DIP-LG-55", quantity: 7 });
});

test("bulk stock accepts positive whole quantities and rejects duplicates", () => {
  assert.deepEqual(parseBulkStockCsv("product_name,seller_sku,quantity_received\nTelevision,DIP-LG-55,12").rows[0], { row: 2, sellerSku: "DIP-LG-55", quantity: 12 });
  const invalid = parseBulkStockCsv("product_name,seller_sku,quantity_received\nOne,SKU-1,2\nTwo,SKU-1,3");
  assert.equal(invalid.rows.length, 0);
  assert.ok(invalid.errors.some(error => error.field === "seller_sku"));
});
