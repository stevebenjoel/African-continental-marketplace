import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const MAX_STATE_AGE_MS = 10 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 60 * 1000;

type OAuthStatePayload = { nonce: string; issuedAt: number; returnTo: string };

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSignedOAuthState(input: { secret: string; returnTo: string; now?: number }) {
  const payload: OAuthStatePayload = {
    nonce: randomBytes(24).toString("base64url"),
    issuedAt: input.now ?? Date.now(),
    returnTo: input.returnTo
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded, input.secret)}`;
}

export function verifySignedOAuthState(input: { token?: string; secret: string; now?: number }): OAuthStatePayload | null {
  try {
    if (!input.token) return null;
    const parts = input.token.split(".");
    if (parts.length !== 2) return null;
    const [encoded, receivedSignature] = parts;
    const expected = Buffer.from(signature(encoded, input.secret));
    const received = Buffer.from(receivedSignature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<OAuthStatePayload>;
    const now = input.now ?? Date.now();
    if (typeof payload.issuedAt !== "number" || payload.issuedAt > now + MAX_CLOCK_SKEW_MS || now - payload.issuedAt > MAX_STATE_AGE_MS) return null;
    if (typeof payload.nonce !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(payload.nonce)) return null;
    if (typeof payload.returnTo !== "string" || !payload.returnTo.startsWith("/") || payload.returnTo.startsWith("//")) return null;
    return payload as OAuthStatePayload;
  } catch {
    return null;
  }
}
