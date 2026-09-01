export function selectFeaturedProducts<T>(featured: readonly T[], fallback: readonly T[], limit = 10): T[] {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Featured product limit must be a positive integer");
  return (featured.length ? featured : fallback).slice(0, limit);
}
