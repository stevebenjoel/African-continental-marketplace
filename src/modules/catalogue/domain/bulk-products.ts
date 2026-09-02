export const BULK_PRODUCT_COLUMNS = ["name","slug","description","category_id","brand_name","manufacturer","country_of_origin","model","gtin","specifications","variant_name","sku","variant_attributes","retail_price","wholesale_price","currency","minimum_order_quantity","fulfilment_method","processing_days"] as const;
export const BULK_PRODUCT_MAX_ROWS = 50;
export const BULK_PRODUCT_MAX_BYTES = 1024 * 1024;

export type BulkProductInput = {
  name: string; slug: string; description: string; categoryId: string; brandName: string; manufacturer: string;
  countryOfOrigin: string; model: string; gtin: string; specifications: string; variantName: string; sku: string;
  variantAttributes: string; retailPriceMinor: number; wholesalePriceMinor?: number; currency: string;
  minimumOrderQuantity: number; fulfilmentMethod: string; processingDays: number;
};
export type BulkProductError = { row: number; field: string; message: string };

function parseCsv(source: string): string[][] {
  const table: string[][] = []; let row: string[] = [], field = "", quoted = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index], next = source[index + 1];
    if (quoted) { if (char === '"' && next === '"') { field += '"'; index++; } else if (char === '"') quoted = false; else field += char; }
    else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); table.push(row); row = []; field = ""; }
    else field += char;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field");
  if (field || row.length) { row.push(field.replace(/\r$/, "")); table.push(row); }
  return table.filter(values => values.some(value => value.trim()));
}

const money = (value: string) => /^\d+(\.\d{1,2})?$/.test(value) ? Math.round(Number(value) * 100) : NaN;
export function parseBulkProductsCsv(source: string, validCategoryIds: ReadonlySet<string>): { products: BulkProductInput[]; errors: BulkProductError[] } {
  let table: string[][];
  try { table = parseCsv(source.replace(/^\uFEFF/, "")); } catch (error) { return { products: [], errors: [{ row: 1, field: "file", message: error instanceof Error ? error.message : "CSV could not be parsed" }] }; }
  if (!table.length) return { products: [], errors: [{ row: 1, field: "file", message: "CSV is empty" }] };
  const headers = table.shift()!.map(value => value.trim().toLowerCase()), errors: BulkProductError[] = [];
  for (const column of BULK_PRODUCT_COLUMNS) if (!headers.includes(column)) errors.push({ row: 1, field: column, message: "Required column is missing" });
  const unexpected = headers.filter(header => header && !BULK_PRODUCT_COLUMNS.includes(header as typeof BULK_PRODUCT_COLUMNS[number]));
  for (const column of unexpected) errors.push({ row: 1, field: column, message: "Unexpected column" });
  if (new Set(headers).size !== headers.length) errors.push({ row: 1, field: "header", message: "Column names must be unique" });
  if (errors.length) return { products: [], errors };
  if (table.length > BULK_PRODUCT_MAX_ROWS) return { products: [], errors: [{ row: 2, field: "file", message: `A file can contain at most ${BULK_PRODUCT_MAX_ROWS} products` }] };
  const index = new Map(headers.map((header, position) => [header, position])), seenSlugs = new Set<string>(), seenSkus = new Set<string>(), products: BulkProductInput[] = [];
  for (let offset = 0; offset < table.length; offset++) {
    const rowNumber = offset + 2, cells = table[offset], value = (field: string) => String(cells[index.get(field) ?? -1] ?? "").trim();
    const name = value("name"), slug = value("slug").toLowerCase(), description = value("description"), categoryId = value("category_id"), countryOfOrigin = value("country_of_origin").toUpperCase(), sku = value("sku"), retailPriceMinor = money(value("retail_price")), wholesaleRaw = value("wholesale_price"), wholesalePriceMinor = wholesaleRaw ? money(wholesaleRaw) : undefined, currency = value("currency").toUpperCase(), minimumOrderQuantity = Number(value("minimum_order_quantity")), fulfilmentMethod = value("fulfilment_method"), processingDays = Number(value("processing_days"));
    const add = (field: string, message: string) => errors.push({ row: rowNumber, field, message });
    if (name.length < 3 || name.length > 240) add("name", "Use 3–240 characters");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 240) add("slug", "Use lowercase letters, numbers and single hyphens");
    if (seenSlugs.has(slug)) add("slug", "Duplicate slug in this file"); else seenSlugs.add(slug);
    if (description.length < 20 || description.length > 5000) add("description", "Use 20–5,000 characters");
    if (!validCategoryIds.has(categoryId)) add("category_id", "Use an active category ID from the template guidance");
    if (!/^[A-Z]{2}$/.test(countryOfOrigin)) add("country_of_origin", "Use a two-letter country code such as NG");
    if (!sku || sku.length > 100) add("sku", "Seller SKU is required and cannot exceed 100 characters");
    if (seenSkus.has(sku.toLowerCase())) add("sku", "Duplicate SKU in this file"); else seenSkus.add(sku.toLowerCase());
    if (!Number.isSafeInteger(retailPriceMinor) || retailPriceMinor < 1) add("retail_price", "Use a positive amount with no more than two decimal places");
    if (wholesaleRaw && (!Number.isSafeInteger(wholesalePriceMinor) || Number(wholesalePriceMinor) < 1)) add("wholesale_price", "Use a positive amount with no more than two decimal places");
    if (!/^[A-Z]{3}$/.test(currency)) add("currency", "Use a three-letter currency code such as NGN");
    if (!Number.isSafeInteger(minimumOrderQuantity) || minimumOrderQuantity < 1) add("minimum_order_quantity", "Use a whole number of at least 1");
    if (!["vendor", "pacsm_logistics"].includes(fulfilmentMethod)) add("fulfilment_method", "Use vendor or pacsm_logistics");
    if (!Number.isSafeInteger(processingDays) || processingDays < 0 || processingDays > 90) add("processing_days", "Use a whole number from 0 to 90");
    if (!value("variant_name")) add("variant_name", "Variant name is required");
    if (!value("variant_attributes")) add("variant_attributes", "Variant attributes are required");
    if (!value("specifications")) add("specifications", "Specifications are required");
    products.push({ name, slug, description, categoryId, brandName: value("brand_name"), manufacturer: value("manufacturer"), countryOfOrigin, model: value("model"), gtin: value("gtin"), specifications: value("specifications"), variantName: value("variant_name"), sku, variantAttributes: value("variant_attributes"), retailPriceMinor, ...(wholesalePriceMinor ? { wholesalePriceMinor } : {}), currency, minimumOrderQuantity, fulfilmentMethod, processingDays });
  }
  return { products: errors.length ? [] : products, errors };
}

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
export function buildBulkProductTemplate(): string {
  const rows = [
    ["Example Shea Body Butter","example-shea-body-butter","Natural shea body butter supplied by a verified PAC-SM seller.","health","Example Brand","Example Manufacturer","GH","SB-250","","Weight: 250 g | Ingredients: Shea butter","250 g jar","DEMO-SHEA-250","Size: 250 g; Pack: Jar","6500","6000","NGN","1","vendor","2"],
    ["Example Solar Home Kit","example-solar-home-kit","Compact solar home kit for lighting and everyday device charging.","electronics","Example Energy","Example Energy Limited","KE","SHK-100","","Panel: 100 W | Warranty: Enter verified warranty","Standard kit","DEMO-SOLAR-100","Colour: Black; Package: Complete kit","185000","175000","NGN","1","pacsm_logistics","4"]
  ];
  return [BULK_PRODUCT_COLUMNS.join(","), ...rows.map(row => row.map(csvCell).join(","))].join("\r\n") + "\r\n";
}
