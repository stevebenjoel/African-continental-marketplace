import {assertSameOrigin, publicAppUrl} from "@/src/modules/auth/server/request-security";
import { requireOrderOperations } from "@/src/modules/authorization/server/require-order-operations";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { transitionVendorOrder } from "@/src/modules/orders/server/fulfilment";

export async function POST(request: Request, { params }: { params: Promise<{ vendorOrderId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await requireOrderOperations("/operations/orders"), [{ vendorOrderId }, form] = await Promise.all([params, request.formData()]);
  const destination = request.headers.get("referer")?.includes("/operations/") ? "/operations/orders" : "/admin/orders";
  try { const vendorOrder = await createAppwriteDatabaseClient().databases.getDocument({ databaseId: env().APPWRITE_DATABASE_ID, collectionId: "vendor_orders", documentId: vendorOrderId }); await transitionVendorOrder({ vendorId: String(vendorOrder.vendorId), vendorOrderId, actorUserId: user.$id, nextStatus: String(form.get("status") ?? ""), carrier: String(form.get("carrier") ?? ""), trackingNumber: String(form.get("trackingNumber") ?? ""), trackingUrl: String(form.get("trackingUrl") ?? "") }); return Response.redirect(publicAppUrl(`${destination}?updated=1`), 303); }
  catch (error) { console.error("Admin order transition failed", error); return Response.redirect(publicAppUrl(`${destination}?error=1`), 303); }
}
