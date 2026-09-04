export function storeSlugCandidates(value: string): string[] {
  const raw = value.trim();
  if (!raw) return [];

  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { /* Preserve malformed input for a safe failed lookup. */ }

  return [...new Set([decoded, raw].map(candidate => candidate.trim().toLowerCase()).filter(Boolean))];
}
