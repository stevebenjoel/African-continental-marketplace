import nextEnv from "@next/env";
import { readFileSync } from "node:fs";
import { Client, Databases } from "node-appwrite";

nextEnv.loadEnvConfig(process.cwd());
const required = (name: string) => { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is required`); return value; };
const key = process.env.APPWRITE_PROVISIONING_KEY?.trim() || readFileSync(required("APPWRITE_PROVISIONING_KEY_FILE"), "utf8").trim();
const client = new Client().setEndpoint(required("APPWRITE_ENDPOINT")).setProject(required("APPWRITE_PROJECT_ID")).setKey(key);
const databases = new Databases(client), databaseId = required("APPWRITE_DATABASE_ID");
const vendorId = "pacsm-demo-vendor", businessId = "pacsm-demo-business", warehouseId = "pacsm-demo-warehouse";
const now = new Date().toISOString();

await databases.upsertDocument({ databaseId, collectionId: "businesses", documentId: businessId, permissions: [], data: { ownerUserId: "pacsm-demo-owner", legalName: "PAC-SM Demo Trading Cooperative", tradingName: "Continental Demo Supply", registrationNumber: "PACSM-DEMO-001", countryCode: "NG", businessType: "cooperative", address: "Lagos, Nigeria", status: "approved" } });
await databases.upsertDocument({ databaseId, collectionId: "vendors", documentId: vendorId, permissions: [], data: { ownerUserId: "pacsm-demo-owner", businessId, merchantId: "PAC-DEMO-SELLER", status: "approved", submittedAt: now, reviewedAt: now, reviewedBy: "system-demo-seed" } });
await databases.upsertDocument({ databaseId, collectionId: "stores", documentId: "pacsm-demo-store", permissions: [], data: { vendorId, ownerUserId: "pacsm-demo-owner", name: "Continental Demo Market", slug: "continental-demo-market", countryCode: "NG", currency: "NGN", status: "active" } });
await databases.upsertDocument({ databaseId, collectionId: "warehouses", documentId: warehouseId, permissions: [], data: { vendorId, name: "Demo Lagos Fulfilment Hub", countryCode: "NG", address: "Lagos Commerce District, Nigeria", status: "active" } });

const names = [
  ["Premium Ofada Rice 5kg","agriculture"],["Pure Shea Butter 500g","health"],["Cold-Pressed Moringa Oil","health"],["Dried Hibiscus Flowers 1kg","agriculture"],["Arabica Coffee Beans 1kg","agriculture"],
  ["Handwoven Kente Scarf","fashion"],["Ankara Print Tote Bag","fashion"],["Leather Crossbody Bag","fashion"],["Adire Lounge Set","fashion"],["Beaded Maasai Necklace","fashion"],
  ["Solar Power Bank 20000mAh","electronics"],["Rechargeable LED Lantern","electronics"],["Bluetooth Market Speaker","electronics"],["Universal Travel Adapter","electronics"],["Smart Energy Monitor","electronics"],
  ["Hand-Carved Serving Bowl","home"],["Woven Storage Basket","home"],["Mudcloth Cushion Cover","home"],["African Black Soap Set","health"],["Ceramic Tea Set","home"],
  ["Baobab Fruit Powder 500g","agriculture"],["Plantain Flour 2kg","agriculture"],["Natural Cocoa Powder 1kg","agriculture"],["Cashew Nut Gift Box","agriculture"],["Premium Palm Oil 5L","agriculture"],
  ["Wholesale Ankara Fabric Bale","fashion"],["Wholesale Shea Butter Carton","health"],["Wholesale Dried Ginger Sack","agriculture"],["Wholesale Cashew Kernel Case","agriculture"],["Wholesale Cocoa Bean Bag","agriculture"],
  ["Commercial Solar Panel 450W","industrial"],["Industrial Safety Boot Carton","industrial"],["Restaurant Melamine Set","industrial"],["Bulk LED Bulb Case","electronics"],["POS Receipt Paper Carton","industrial"],
  ["Hotel Cotton Towel Bale","home"],["School Exercise Book Carton","industrial"],["Recycled Shopping Bag Bundle","industrial"],["Bulk Liquid Black Soap 20L","health"],["Salon Hair Extension Carton","health"],
  ["Wholesale Coffee Bean Sack","agriculture"],["Wholesale Hibiscus Export Bag","agriculture"],["Construction Work Glove Case","industrial"],["Stainless Cookware Carton","home"],["Mobile Phone Accessory Bundle","electronics"],
  ["Organic Fertilizer 50kg Pallet","industrial"],["Irrigation Drip Kit Bundle","industrial"],["Protective Packaging Carton","industrial"],["Cotton Wax Print Roll Pack","fashion"],["Handmade Basket Wholesale Lot","home"]
] as const;

for (let index = 0; index < names.length; index++) {
  const number = String(index + 1).padStart(2, "0"), [name, categoryId] = names[index];
  const wholesale = index >= 25, productId = `demo-product-${number}`, variantId = `demo-variant-${number}`, offerId = `demo-offer-${number}`, slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const retailPriceMinor = wholesale ? 1500000 + index * 72500 : 450000 + index * 85000;
  await databases.upsertDocument({ databaseId, collectionId: "products", documentId: productId, permissions: [], data: { submittedByVendorId: vendorId, name, slug, description: `${name} supplied by a verified African marketplace demo seller. This sample listing can be renamed or deleted from the PAC-SM admin catalogue.`, categoryId, brandName: wholesale ? "Continental Trade Supply" : "Made in Africa Select", manufacturer: "PAC-SM Demo Producer Network", countryOfOrigin: ["NG","GH","KE","ZA","ET"][index % 5], model: `DEMO-${number}`, specifications: JSON.stringify({ demo: true, market: wholesale ? "wholesale" : "retail" }), status: "approved", submittedAt: now, reviewedBy: "system-demo-seed", reviewedAt: now } });
  await databases.upsertDocument({ databaseId, collectionId: "product_variants", documentId: variantId, permissions: [], data: { productId, name: wholesale ? "Wholesale pack" : "Standard", sku: `PAC-DEMO-${number}`, attributes: JSON.stringify({ market: wholesale ? "wholesale" : "retail" }), status: "approved" } });
  await databases.upsertDocument({ databaseId, collectionId: "seller_offers", documentId: offerId, permissions: [], data: { vendorId, productId, variantId, sellerSku: `PAC-DEMO-${number}`, retailPriceMinor, ...(wholesale ? { wholesalePriceMinor: retailPriceMinor } : {}), currency: "NGN", minimumOrderQuantity: wholesale ? 10 : 1, maximumOrderQuantity: wholesale ? 500 : 20, fulfilmentMethod: "seller_fulfilled", processingDays: wholesale ? 5 : 2, status: "approved", submittedAt: now } });
  await databases.upsertDocument({ databaseId, collectionId: "inventory_balances", documentId: `demo-stock-${number}`, permissions: [], data: { vendorId, warehouseId, offerId, onHand: wholesale ? 1000 : 120, reserved: 0, incoming: 0, damaged: 0, version: 1 } });
  process.stdout.write(`seeded ${index + 1}/50 ${name}\n`);
}
process.stdout.write("demo catalogue ready: 25 retail and 25 wholesale products\n");
