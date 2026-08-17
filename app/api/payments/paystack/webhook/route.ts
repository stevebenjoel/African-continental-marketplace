import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/src/shared/config/env";
import { capturePaystackWebhook } from "@/src/modules/payments/server/providers";

export async function POST(request: Request) {
  const secret = env().PAYSTACK_SECRET_KEY;
  if (!secret) return new Response("Not configured", { status: 503 });
  const body = await request.text(), supplied = request.headers.get("x-paystack-signature") ?? "", expected = createHmac("sha512", secret).update(body).digest("hex");
  const valid = supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  if (!valid) return new Response("Invalid signature", { status: 401 });
  const event = JSON.parse(body) as { event?: string; data?: { status?: string; reference?: string; amount?: number; currency?: string; metadata?: { orderId?: string } } };
  if (event.event !== "charge.success" || !event.data) return new Response("OK");
  try { await capturePaystackWebhook(event.data); return new Response("OK"); }
  catch (error) { console.error("Paystack webhook capture failed", error); return new Response("Retry", { status: 500 }); }
}
