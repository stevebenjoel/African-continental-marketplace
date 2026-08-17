export const API_SCOPES = ["products:read", "inventory:read", "inventory:write", "orders:read", "webhooks:manage"] as const;
export type ApiScope = typeof API_SCOPES[number];
export function validScopes(values: string[]): values is ApiScope[] { return values.length > 0 && values.every(value => (API_SCOPES as readonly string[]).includes(value)); }
export function hasScope(granted: readonly string[], required: ApiScope) { return granted.includes(required); }
