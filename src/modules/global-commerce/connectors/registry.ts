import type { SupplierConnector } from "../domain/connector";
import { CJConnector } from "./cj/connector";

const connectors: Record<string, () => SupplierConnector> = { cj: () => new CJConnector() };
export function supplierConnector(provider: string): SupplierConnector { const factory = connectors[provider.toLowerCase()]; if (!factory) throw new Error(`Unsupported supplier connector: ${provider}`); return factory(); }
