import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin } from "@/src/modules/auth/server/request-security";
import { addWishlist } from "@/src/modules/engagement/server/wishlist";
export async function POST(request: Request) { try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); } const user = await getCurrentAppwriteUser(); if (!user) return new Response("Unauthorized", { status: 401 }); const form = await request.formData(); await addWishlist(user.$id, String(form.get("productId") ?? "")); return Response.redirect(new URL(String(form.get("returnTo") ?? "/wishlist"), request.url), 303); }
