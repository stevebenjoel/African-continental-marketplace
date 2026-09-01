import nextEnv from "@next/env";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { Client, Databases, ID, Query, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

nextEnv.loadEnvConfig(process.cwd());

type CsvRow = Record<string, string>;
const required = (name: string) => { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is required`); return value; };
const argument = (name: string) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
const apply = process.argv.includes("--apply"), confirmMediaRights = process.argv.includes("--confirm-media-rights");
const csvPath = argument("--file");
if (!csvPath) throw new Error("Usage: npm run catalogue:import-brand -- --file <catalogue.csv> [--apply] [--confirm-media-rights]");

function parseCsv(source: string): CsvRow[] {
  const table: string[][] = []; let row: string[] = [], field = "", quoted = false;
  for (let index = 0; index < source.length; index++) { const char = source[index], next = source[index + 1]; if (quoted) { if (char === '"' && next === '"') { field += '"'; index++; } else if (char === '"') quoted = false; else field += char; } else if (char === '"') quoted = true; else if (char === ",") { row.push(field); field = ""; } else if (char === "\n") { row.push(field.replace(/\r$/, "")); table.push(row); row = []; field = ""; } else field += char; }
  if (field || row.length) { row.push(field.replace(/\r$/, "")); table.push(row); }
  const headers = table.shift()?.map(value => value.trim()) ?? [];
  return table.filter(values => values.some(Boolean)).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""])));
}

const rows = parseCsv(readFileSync(csvPath, "utf8"));
const columns = ["brand","category","product_name","model","product_id","product_page_url","price_ngn","currency","stock_status","gallery_image_count","price_source","price_source_url","official_catalog_url","checked_date"];
for (const column of columns) if (!rows.length || !(column in rows[0])) throw new Error(`CSV column ${column} is required`);
const duplicates = rows.filter((row, index) => rows.findIndex(candidate => candidate.product_id === row.product_id || candidate.model.toLowerCase() === row.model.toLowerCase()) !== index);
if (duplicates.length) throw new Error(`Duplicate product IDs or models: ${duplicates.map(row => row.model).join(", ")}`);
for (const row of rows) { if (!row.product_name || !row.model || !row.product_id || !/^\d+(\.\d{1,2})?$/.test(row.price_ngn) || row.currency !== "NGN" || !/^https:\/\//.test(row.product_page_url)) throw new Error(`Invalid product row ${row.product_id || row.product_name || "unknown"}`); }

const vendorId = process.env.DIPLOMATS_STORES_VENDOR_ID?.trim() || "6a8b7faa002678103b9d";
const ownerUserId = process.env.DIPLOMATS_STORES_OWNER_USER_ID?.trim() || "6a8b7cef00207dad193a";
const warehouseId = process.env.DIPLOMATS_STORES_WAREHOUSE_ID?.trim() || "6a8b930e0023f4911c4b";
const originCountry = (argument("--origin-country") || "ZZ").toUpperCase();
if (!/^[A-Z]{2}$/.test(originCountry)) throw new Error("--origin-country must be a two-letter code; omit it to record unknown origin as ZZ");
const categoryMap: Record<string, string> = { "Cold Storage": "home", "Garment Care": "home", "Kitchen Appliances": "home", "Air Cooling": "home", "Power Solutions": "electronics", "Sound and Vision": "electronics" };
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 190);
const safeId = (prefix: string, externalId: string) => `${prefix}-${externalId.replace(/[^a-zA-Z0-9._-]/g, "-")}`.slice(0, 36);
const imageUrls = (row: CsvRow) => Array.from({ length: 15 }, (_, index) => row[`image_url_${index + 1}`]).filter(Boolean);
async function fetchImage(url: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { return await fetch(url, { signal: AbortSignal.timeout(30000) }); }
    catch (error) { if (attempt === 3) { console.warn(`skipped image after ${attempt} network attempts: ${url}`, error); return null; } }
  }
  return null;
}
const brand = rows[0]?.brand || "Imported Brand";
if (rows.some(row => row.brand.toLowerCase() !== brand.toLowerCase())) throw new Error("Every row in one import must use the same brand");
const brandKey = slugify(brand).slice(0, 12) || "brand";
const idPrefixes = brandKey === "thermocool"
  ? { product: "thermocool", variant: "tcv", offer: "tco", balance: "tcb", media: "tcm", sku: "THC" }
  : { product: brandKey, variant: `${brandKey}v`, offer: `${brandKey}o`, balance: `${brandKey}b`, media: `${brandKey}m`, sku: brandKey.toUpperCase().slice(0, 8) };
if (!apply) { console.log(JSON.stringify({ mode: "dry-run", source: basename(csvPath), brand, products: rows.length, categories: [...new Set(rows.map(row => row.category))], imagesReferenced: rows.reduce((sum, row) => sum + imageUrls(row).length, 0), accountingOwner: { vendorId, ownerUserId, warehouseId }, stockPolicy: "zero until Diplomats Stores confirms physical inventory", mediaPolicy: "not copied without --confirm-media-rights" }, null, 2)); process.exit(0); }

const runtimeKey = process.env.APPWRITE_API_KEY?.trim() || readFileSync(required("APPWRITE_API_KEY_FILE"), "utf8").trim();
const client = new Client().setEndpoint(required("APPWRITE_ENDPOINT")).setProject(required("APPWRITE_PROJECT_ID")).setKey(runtimeKey);
const databases = new Databases(client), storage = new Storage(client), databaseId = required("APPWRITE_DATABASE_ID"), bucketId = required("APPWRITE_PRODUCT_MEDIA_BUCKET_ID"), now = new Date().toISOString();
const [vendor, store, warehouse] = await Promise.all([databases.getDocument({ databaseId, collectionId: "vendors", documentId: vendorId }), databases.listDocuments({ databaseId, collectionId: "stores", queries: [Query.equal("vendorId", vendorId), Query.equal("status", "active"), Query.limit(1)] }), databases.getDocument({ databaseId, collectionId: "warehouses", documentId: warehouseId })]);
if (!["approved","active"].includes(String(vendor.status)) || !store.documents[0] || String(warehouse.vendorId) !== vendorId || warehouse.status !== "active") throw new Error("Diplomats Stores vendor, active store or warehouse validation failed");

let mediaImported = 0, mediaSkipped = 0;
for (let index = 0; index < rows.length; index++) {
  const row = rows[index], productId = safeId(idPrefixes.product, row.product_id), variantId = safeId(idPrefixes.variant, row.product_id), offerId = safeId(idPrefixes.offer, row.product_id), balanceId = safeId(idPrefixes.balance, row.product_id), categoryId = categoryMap[row.category] ?? "home", slug = `${slugify(row.product_name)}-${brandKey}-${row.product_id}`, priceMinor = Math.round(Number(row.price_ngn) * 100), sku = `DIP-${idPrefixes.sku}-${row.model.replace(/[^A-Za-z0-9-]/g, "-")}`.slice(0, 100), urls = imageUrls(row);
  const description = `${row.product_name} is a ${row.category.toLowerCase()} product in the ${brand} range. Model ${row.model}. Supplied on PAC-SM by Diplomats Stores; availability is confirmed before checkout.`;
  const specifications = JSON.stringify({ importFormat: "brand_catalogue_v1", sourceProductId: row.product_id, sourceCategory: row.category, model: row.model, priceSource: row.price_source, priceSourceUrl: row.price_source_url, productPageUrl: row.product_page_url, officialCatalogUrl: row.official_catalog_url, sourceCheckedDate: row.checked_date, sourceStockStatus: row.stock_status, sourceGalleryStatus: row.gallery_source_status, sourceImageUrls: urls, accountingOwner: "Diplomats Stores", countryOfOriginStatus: originCountry === "ZZ" ? "not supplied by source" : "supplier confirmed" });
  await databases.upsertDocument({ databaseId, collectionId: "products", documentId: productId, permissions: [], data: { submittedByVendorId: vendorId, name: row.product_name, slug, description, categoryId, brandName: brand, manufacturer: brand, countryOfOrigin: originCountry, model: row.model, specifications, status: "approved", submittedAt: now, reviewedBy: ownerUserId, reviewedAt: now } });
  await databases.upsertDocument({ databaseId, collectionId: "product_variants", documentId: variantId, permissions: [], data: { productId, name: row.model, sku, attributes: JSON.stringify({ model: row.model, sourceCategory: row.category }), status: "approved" } });
  await databases.upsertDocument({ databaseId, collectionId: "seller_offers", documentId: offerId, permissions: [], data: { vendorId, productId, variantId, sellerSku: sku, retailPriceMinor: priceMinor, currency: "NGN", minimumOrderQuantity: 1, maximumOrderQuantity: 20, fulfilmentMethod: "seller_fulfilled", processingDays: 3, status: "approved", submittedAt: now } });
  await databases.upsertDocument({ databaseId, collectionId: "inventory_balances", documentId: balanceId, permissions: [], data: { vendorId, warehouseId, offerId, onHand: 0, reserved: 0, incoming: 0, damaged: 0, version: 1 } });
  if (confirmMediaRights) for (let imageIndex = 0; imageIndex < urls.length; imageIndex++) {
    const existing = await databases.listDocuments({ databaseId, collectionId: "product_media", queries: [Query.equal("productId", productId), Query.equal("sortOrder", imageIndex), Query.limit(1)] });
    if (existing.total) continue;
    const response = await fetchImage(urls[imageIndex]);
    if (!response) { mediaSkipped++; continue; }
    if (!response.ok) { mediaSkipped++; console.warn(`skipped unavailable image ${response.status}: ${urls[imageIndex]}`); continue; }
    const mimeType = response.headers.get("content-type")?.split(";")[0].toLowerCase() ?? "", buffer = Buffer.from(await response.arrayBuffer());
    if (!["image/jpeg","image/png","image/webp"].includes(mimeType) || buffer.length < 1 || buffer.length > 8 * 1024 * 1024) { mediaSkipped++; console.warn(`skipped unsupported image (${mimeType || "unknown"}, ${buffer.length} bytes): ${urls[imageIndex]}`); continue; }
    const extension = mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg", fileId = safeId(`${idPrefixes.media}-${row.product_id}`, String(imageIndex + 1)), filename = `${slugify(row.model)}-${imageIndex + 1}${extension}`;
    try { await storage.createFile({ bucketId, fileId, file: InputFile.fromBuffer(buffer, filename), permissions: [] }); } catch (error) { if (!(typeof error === "object" && error && "code" in error && Number(error.code) === 409)) throw error; }
    await databases.upsertDocument({ databaseId, collectionId: "product_media", documentId: fileId, permissions: [], data: { productId, vendorId, bucketId, fileId, filename, mimeType, sizeBytes: buffer.length, altText: `${row.product_name} view ${imageIndex + 1}`, sortOrder: imageIndex, isPrimary: imageIndex === 0 ? "true" : "false", status: "approved", uploadedAt: now, reviewedAt: now, reviewedBy: ownerUserId, reviewNotes: `Imported after explicit media-rights confirmation from ${row.price_source}` } });
    mediaImported++;
  }
  process.stdout.write(`imported ${index + 1}/${rows.length} ${row.model}\n`);
}
await databases.createDocument({ databaseId, collectionId: "audit_logs", documentId: ID.unique(), permissions: [], data: { actorUserId: ownerUserId, action: "catalogue.brand_import", entityType: "vendor", entityId: vendorId, metadata: JSON.stringify({ source: basename(csvPath), brand, products: rows.length, mediaImported, mediaSkipped, mediaRightsConfirmed: confirmMediaRights }), occurredAt: now } });
console.log(JSON.stringify({ status: "complete", products: rows.length, mediaImported, mediaSkipped, brand, store: store.documents[0].name, source: basename(csvPath) }, null, 2));
