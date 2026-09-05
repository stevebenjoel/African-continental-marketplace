import { requireSuperAdmin } from "@/src/modules/authorization/server/require-super-admin";
import { assertSameOrigin, publicAppUrl } from "@/src/modules/auth/server/request-security";
import { testGlobalSupplierConnection } from "@/src/modules/global-commerce/server/repository";

export async function POST(request: Request, { params }: { params: Promise<{ supplierId: string }> }) { try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); } const admin = await requireSuperAdmin(), { supplierId } = await params; try { await testGlobalSupplierConnection(supplierId, admin.$id); return Response.redirect(publicAppUrl("/admin/global-commerce?connected=1"), 303); } catch (error) { console.error("Global supplier connection test failed", error); return Response.redirect(publicAppUrl("/admin/global-commerce?error=connection"), 303); } }
