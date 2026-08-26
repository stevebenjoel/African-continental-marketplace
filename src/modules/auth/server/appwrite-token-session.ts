import "server-only";
import { extractAppwriteSessionSecret } from "@/src/modules/auth/domain/appwrite-session-cookie";
import { env } from "@/src/shared/config/env";

export async function createAppwriteTokenSession(input: { userId: string; tokenSecret: string }) {
  const config = env();
  const response = await fetch(`${config.APPWRITE_ENDPOINT}/account/sessions/token`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-appwrite-project": config.APPWRITE_PROJECT_ID,
      "x-appwrite-response-format": "1.8.1"
    },
    body: JSON.stringify({ userId: input.userId, secret: input.tokenSecret }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000)
  });
  const session = await response.json().catch(() => ({})) as { expire?: string; message?: string };
  if (!response.ok) throw new Error(session.message ?? `Appwrite token exchange failed (${response.status})`);
  const secret = extractAppwriteSessionSecret(response.headers.getSetCookie(), config.APPWRITE_PROJECT_ID);
  if (!secret) throw new Error("Appwrite did not return a server session cookie");
  return { secret, expire: session.expire };
}
