import "server-only";
import { env } from "@/src/shared/config/env";

const RESEND_EMAILS_URL = "https://api.resend.com/emails";

export type TransactionalEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
};

export type EmailDelivery =
  | { status: "sent"; id: string }
  | { status: "not_configured" };

export async function sendTransactionalEmail(message: TransactionalEmail): Promise<EmailDelivery> {
  const config = env();
  if (!config.RESEND_API_KEY) return { status: "not_configured" };

  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.RESEND_API_KEY}`,
      "content-type": "application/json",
      ...(message.idempotencyKey ? { "idempotency-key": message.idempotencyKey } : {})
    },
    body: JSON.stringify({
      from: config.RESEND_FROM_EMAIL,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(config.RESEND_REPLY_TO_EMAIL ? { reply_to: config.RESEND_REPLY_TO_EMAIL } : {})
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store"
  });

  const result = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok || !result.id) {
    throw new Error(`Resend delivery failed (${response.status}): ${result.message ?? "unknown error"}`);
  }
  return { status: "sent", id: result.id };
}
