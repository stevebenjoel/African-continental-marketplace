import "server-only";
import { env } from "@/src/shared/config/env";

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  const requestOrigin = host ? `${protocol}://${host}` : new URL(request.url).origin;
  const allowedOrigins = new Set([requestOrigin, new URL(env().APP_BASE_URL).origin]);
  if (!origin || !allowedOrigins.has(origin)) throw new Error("Invalid request origin");
}

export function safeReturnTo(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/account";
  return value;
}

export function publicAppUrl(path: string): URL {
  return new URL(path, env().APP_BASE_URL);
}
