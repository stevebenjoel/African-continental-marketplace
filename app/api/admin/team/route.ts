import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin, publicAppUrl } from "@/src/modules/auth/server/request-security";
import { isSuperAdmin } from "@/src/modules/authorization/domain/super-admin";
import { selectAdminRoles } from "@/src/modules/authorization/domain/admin-roles";
import { assignAdminRoles } from "@/src/modules/authorization/server/admin-team";

export async function POST(request:Request){
  try{assertSameOrigin(request)}catch{return new Response("Forbidden",{status:403})}
  const user=await getCurrentAppwriteUser();
  if(!user||!isSuperAdmin(user.labels))return new Response("Forbidden",{status:403});
  const form=await request.formData(),roles=selectAdminRoles(form.getAll("roles").map(String));
  if(!roles.length)return Response.redirect(publicAppUrl("/admin/team?error=roles"),303);
  try{
    await assignAdminRoles(String(form.get("email")),roles,user.$id);
    return Response.redirect(publicAppUrl(`/admin/team?assigned=${roles.length}`),303);
  }catch(error){
    console.error("Role assignment failed",error);
    const failure=error&&typeof error==="object"?error as {type?:unknown;code?:unknown;message?:unknown}:{};
    const detail=String(failure.type??failure.message??"").toLowerCase();
    const reason=detail.includes("scope")||failure.code===401?"scope":detail.includes("register first")?"not_found":detail.includes("super administrator")?"superadmin":"assignment";
    return Response.redirect(publicAppUrl(`/admin/team?error=${reason}`),303);
  }
}
