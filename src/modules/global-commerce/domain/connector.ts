import type { FulfilmentType } from "./supplier";

export type ConnectionResult = Readonly<{ ok: boolean; provider: string; externalAccountId?: string; tokenExpiresAt?: string; message: string; requestId?: string }>;
export type SupplierCredentials = Readonly<{ apiKey: string; accessToken?: string; refreshToken?: string; openId?: string; accessTokenExpiresAt?: string; refreshTokenExpiresAt?: string }>;
export type SupplierProductSummary = Readonly<{ externalProductId: string; title: string; imageUrl?: string; currency?: string; minimumCostMinor?: number }>;
export type SupplierCategory = Readonly<{ id: string; name: string; path: string; level: number }>;
export type SupplierWarehouseStock = Readonly<{ warehouseId: string; warehouseName: string; countryCode: string; available: number; cjInventory?: number; factoryInventory?: number }>;
export type SupplierVariant = Readonly<{ id: string; sku: string; name: string; imageUrl?: string; costMinor?: number; weightGrams?: number; lengthMm?: number; widthMm?: number; heightMm?: number; stock: SupplierWarehouseStock[] }>;
export type SupplierProductDetail = SupplierProductSummary & Readonly<{ sku: string; description?: string; categoryId?: string; categoryName?: string; images: string[]; weightGrams?: number; unit?: string; variants: SupplierVariant[] }>;
export type SupplierProductSearch = Readonly<{ products: (SupplierProductSummary & { sku?: string; categoryName?: string; countryCode?: string; inventory?: number })[]; total: number; page: number; pageSize: number }>;
export interface SupplierConnector {
  readonly provider: string;
  readonly supportedFulfilmentTypes: readonly FulfilmentType[];
  authenticate(credentials: SupplierCredentials): Promise<{ result: ConnectionResult; credentials: SupplierCredentials }>;
  testConnection(credentials: SupplierCredentials): Promise<{ result: ConnectionResult; credentials: SupplierCredentials }>;
  listCategories?(credentials: SupplierCredentials): Promise<SupplierCategory[]>;
  searchProducts?(credentials: SupplierCredentials, input: { keyword?: string; categoryId?: string; countryCode?: string; page: number; pageSize: number }): Promise<SupplierProductSearch>;
  getProduct?(credentials: SupplierCredentials, externalProductId: string): Promise<SupplierProductDetail>;
}
