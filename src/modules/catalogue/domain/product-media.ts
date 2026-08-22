export const PRODUCT_MEDIA_LIMIT = 8;
export const PRODUCT_MEDIA_MAX_BYTES = 8 * 1024 * 1024;
export const PRODUCT_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function validProductImageSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (mimeType === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

export function normalizeProductImageAlt(value: string): string {
  const alt = value.trim().replace(/\s+/g, " ");
  if (alt.length < 3 || alt.length > 180) throw new Error("Image description must be between 3 and 180 characters");
  return alt;
}
