import nextEnv from "@next/env";
import { readFileSync } from "node:fs";
import { Client, Databases, Query } from "node-appwrite";

nextEnv.loadEnvConfig(process.cwd());
const required = (name: string) => { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is required`); return value; };
const argument = (name: string) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1]?.trim() : undefined; };
const brand = argument("--brand");
if (!brand) throw new Error("Usage: npx tsx scripts/verify-brand-catalogue.ts --brand <brand>");
const runtimeKey = process.env.APPWRITE_API_KEY?.trim() || readFileSync(required("APPWRITE_API_KEY_FILE"), "utf8").trim();
const client = new Client().setEndpoint(required("APPWRITE_ENDPOINT")).setProject(required("APPWRITE_PROJECT_ID")).setKey(runtimeKey);
const databases = new Databases(client), databaseId = required("APPWRITE_DATABASE_ID"), vendorId = process.env.DIPLOMATS_STORES_VENDOR_ID?.trim() || "6a8b7faa002678103b9d";
const products = await databases.listDocuments({ databaseId, collectionId: "products", queries: [Query.equal("brandName", brand), Query.equal("status", "approved"), Query.limit(5000)] });
const productIds = new Set(products.documents.map(product => product.$id));
const media = await databases.listDocuments({ databaseId, collectionId: "product_media", queries: [Query.equal("vendorId", vendorId), Query.equal("status", "approved"), Query.limit(5000)] });
const brandMedia = media.documents.filter(item => productIds.has(String(item.productId)));
const productsWithMedia = new Set(brandMedia.map(item => String(item.productId)));
console.log(JSON.stringify({ brand, approvedProducts: products.total, approvedMedia: brandMedia.length, productsWithMedia: productsWithMedia.size, productsWithoutMedia: products.total - productsWithMedia.size, primaryImages: brandMedia.filter(item => String(item.isPrimary) === "true").length, accountingVendorId: vendorId }, null, 2));
