export const BULK_STOCK_MAX_ROWS = 100;
export type BulkStockRow = Readonly<{ row: number; sellerSku: string; quantity: number }>;
export type BulkStockError = Readonly<{ row: number; field: string; message: string }>;

const cells = (line: string) => { const result: string[] = []; let value = "", quoted = false; for (let index = 0; index < line.length; index++) { const character = line[index]; if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index++; } else if (character === '"') quoted = !quoted; else if (character === "," && !quoted) { result.push(value.trim()); value = ""; } else value += character; } result.push(value.trim()); return result; };
export function parseBulkStockCsv(source: string): { rows: BulkStockRow[]; errors: BulkStockError[] } {
  const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim()), errors: BulkStockError[] = [], rows: BulkStockRow[] = [];
  if (!lines.length) return { rows, errors: [{ row: 1, field: "file", message: "CSV is empty" }] };
  const header = cells(lines[0]).map(value => value.toLowerCase());
  if (header.join(",") !== "product_name,seller_sku,quantity_received") return { rows, errors: [{ row: 1, field: "header", message: "Use the PAC-SM stock template without changing its headings" }] };
  if (lines.length - 1 > BULK_STOCK_MAX_ROWS) errors.push({ row: 1, field: "file", message: `A stock file can contain at most ${BULK_STOCK_MAX_ROWS} products` });
  const seen = new Set<string>();
  for (let index = 1; index < lines.length; index++) { const [, skuValue = "", quantityValue = ""] = cells(lines[index]), sellerSku = skuValue.trim(), quantity = Number(quantityValue); if (!sellerSku) errors.push({ row: index + 1, field: "seller_sku", message: "Seller SKU is required" }); if (!Number.isSafeInteger(quantity) || quantity < 1) errors.push({ row: index + 1, field: "quantity_received", message: "Enter a whole number greater than zero" }); if (seen.has(sellerSku.toLowerCase())) errors.push({ row: index + 1, field: "seller_sku", message: "SKU appears more than once" }); seen.add(sellerSku.toLowerCase()); rows.push({ row: index + 1, sellerSku, quantity }); }
  return { rows: errors.length ? [] : rows, errors };
}

const csv = (value: string) => `"${value.replaceAll('"', '""')}"`;
export function buildBulkStockTemplate(products: ReadonlyArray<{ name: string; sellerSku: string }>) { return ["product_name,seller_sku,quantity_received", ...products.map(product => `${csv(product.name)},${csv(product.sellerSku)},""`)].join("\r\n") + "\r\n"; }
