export function isGlobalStoreProduct(product: unknown) {
  try {
    const record = product as { specifications?: unknown };
    const value = JSON.parse(String(record.specifications ?? "{}")) as { channel?: unknown };
    return value.channel === "pacsm_global";
  } catch {
    return false;
  }
}
