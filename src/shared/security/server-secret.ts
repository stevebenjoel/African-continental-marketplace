import "server-only";
import { readFileSync } from "node:fs";

export function readSecret(value: string | undefined, filePath: string | undefined, label: string): string {
  if (value?.trim()) return value.trim();
  if (!filePath?.trim()) throw new Error(`${label} is not configured`);

  const secret = readFileSync(filePath, "utf8").trim();
  if (!secret) throw new Error(`${label} file is empty`);
  return secret;
}
