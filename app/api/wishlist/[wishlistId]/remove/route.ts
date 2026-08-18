import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import {assertSameOrigin, publicAppUrl} from "@/src/modules/auth/server/request-security";
import { removeWishlist } from "@/src/modules/engagement/server/wishlist";
export async function POST(request: Request, { params }: { params: Promise<{ wishlistId: string }> }) { try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); } const user = await getCurrentAppwriteUser(); if (!user) return new Response("Unauthorized", { status: 401 }); const { wishlistId } = await params; await removeWishlist(user.$id, wishlistId); return Response.redirect(publicAppUrl("/wishlist"), 303); }
