import "server-only";
import { ID } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { captureSimulatedPayment, captureVerifiedPayment } from "./simulated-payment";

export const paymentProviders = ["demo", "paystack", "papss"] as const;
export type PaymentProvider = (typeof paymentProviders)[number];
export const isPaymentProvider = (value: string): value is PaymentProvider => paymentProviders.includes(value as PaymentProvider);

export async function startPayment(input: { userId: string; email: string; orderId: string; provider: PaymentProvider; origin: string }) {
  const { databases } = createAppwriteDatabaseClient();
  const order = await databases.getDocument({ databaseId: env().APPWRITE_DATABASE_ID, collectionId: "orders", documentId: input.orderId });
  if (String(order.customerUserId) !== input.userId || String(order.status) !== "pending_payment") throw new Error("Order is not payable");
  if (input.provider === "demo") { await captureSimulatedPayment(input.userId, input.orderId); return `${input.origin}/orders/${input.orderId}?paid=1`; }
  if (input.provider === "paystack") {
    const secret = env().PAYSTACK_SECRET_KEY;
    if (!secret) { await captureVerifiedPayment(input.userId, input.orderId, "paystack", `sandbox-${input.orderId}`); return `${input.origin}/orders/${input.orderId}?paid=1&paymentMode=sandbox`; }
    const reference = `PACSM-${ID.unique()}`;
    const response = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ email: input.email, amount: Number(order.totalMinor), currency: String(order.currency), reference, callback_url: `${input.origin}/api/payments/paystack/callback?orderId=${encodeURIComponent(input.orderId)}`, metadata: { orderId: input.orderId } }), cache: "no-store" });
    const result = await response.json() as { status?: boolean; data?: { authorization_url?: string } };
    if (!response.ok || !result.status || !result.data?.authorization_url) throw new Error("Paystack initialization failed");
    return result.data.authorization_url;
  }
  await captureVerifiedPayment(input.userId, input.orderId, "papss", `sandbox-${input.orderId}`);
  return `${input.origin}/orders/${input.orderId}?paid=1&paymentMode=sandbox`;
}

export async function capturePaystackWebhook(payment: { status?: string; reference?: string; amount?: number; currency?: string; metadata?: { orderId?: string } }) {
  const orderId = payment.metadata?.orderId, reference = payment.reference;
  if (!orderId || !reference || payment.status !== "success") throw new Error("Invalid Paystack event");
  const { databases } = createAppwriteDatabaseClient();
  const order = await databases.getDocument({ databaseId: env().APPWRITE_DATABASE_ID, collectionId: "orders", documentId: orderId });
  if (Number(payment.amount) !== Number(order.totalMinor) || String(payment.currency).toUpperCase() !== String(order.currency).toUpperCase()) throw new Error("Paystack amount mismatch");
  return captureVerifiedPayment(String(order.customerUserId), orderId, "paystack", reference);
}

export async function verifyPaystack(reference: string, orderId: string, userId: string) {
  const secret = env().PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("Paystack is not configured");
  const { databases } = createAppwriteDatabaseClient();
  const order = await databases.getDocument({ databaseId: env().APPWRITE_DATABASE_ID, collectionId: "orders", documentId: orderId });
  if (String(order.customerUserId) !== userId) throw new Error("Order not found");
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" });
  const result = await response.json() as { status?: boolean; data?: { status?: string; reference?: string; amount?: number; currency?: string; metadata?: { orderId?: string } } };
  const payment = result.data;
  if (!response.ok || !result.status || payment?.status !== "success" || payment.reference !== reference || Number(payment.amount) !== Number(order.totalMinor) || String(payment.currency).toUpperCase() !== String(order.currency).toUpperCase() || payment.metadata?.orderId !== orderId) throw new Error("Payment verification failed");
  return captureVerifiedPayment(userId, orderId, "paystack", reference);
}
