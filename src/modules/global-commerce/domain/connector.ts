import type { FulfilmentType } from "./supplier";

export type ConnectionResult = Readonly<{ ok: boolean; provider: string; externalAccountId?: string; tokenExpiresAt?: string; message: string; requestId?: string }>;
export type SupplierCredentials = Readonly<{ apiKey: string; accessToken?: string; refreshToken?: string; openId?: string; accessTokenExpiresAt?: string; refreshTokenExpiresAt?: string }>;
export type SupplierProductSummary = Readonly<{ externalProductId: string; title: string; imageUrl?: string; currency?: string; minimumCostMinor?: number }>;
export interface SupplierConnector {
  readonly provider: string;
  readonly supportedFulfilmentTypes: readonly FulfilmentType[];
  authenticate(credentials: SupplierCredentials): Promise<{ result: ConnectionResult; credentials: SupplierCredentials }>;
  testConnection(credentials: SupplierCredentials): Promise<{ result: ConnectionResult; credentials: SupplierCredentials }>;
  searchProducts?(input: { keyword?: string; page: number; pageSize: number }): Promise<{ products: SupplierProductSummary[]; total?: number }>;
}
