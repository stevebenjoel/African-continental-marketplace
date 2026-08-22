import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin, publicAppUrl } from "@/src/modules/auth/server/request-security";
import { deleteVendorProductMedia, setVendorPrimaryMedia } from "@/src/modules/catalogue/server/media";
import { findVendorByOwner } from "@/src/modules/vendors/server/repository";

export async function POST(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await getCurrentAppwriteUser();
  if (!user) return Response.redirect(publicAppUrl("/login?returnTo=/seller/products"), 303);
  const vendor = await findVendorByOwner(user.$id);
  if (!vendor) return new Response("Not found", { status: 404 });
  const form = await request.formData(), action = String(form.get("action")), { mediaId } = await params;
  try {
    if (action === "primary") await setVendorPrimaryMedia(mediaId, vendor.$id, user.$id);
    else if (action === "delete") await deleteVendorProductMedia(mediaId, vendor.$id, user.$id);
    else return new Response("Invalid action", { status: 400 });
    return Response.redirect(publicAppUrl("/seller/products?media=updated"), 303);
  } catch { return Response.redirect(publicAppUrl("/seller/products?media=error"), 303); }
}
