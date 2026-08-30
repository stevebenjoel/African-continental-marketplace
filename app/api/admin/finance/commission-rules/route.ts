import { requireSuperAdmin } from "@/src/modules/authorization/server/require-super-admin";
import { createCommissionRule, type CommissionChannel, type CommissionScope } from "@/src/modules/finance/server/commissions";
import { assertSameOrigin, publicAppUrl } from "@/src/modules/auth/server/request-security";

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden",{status:403}); }
  const user=await requireSuperAdmin(),form=await request.formData();
  try { const ratePercent=Number(form.get("pacsmPercent")); await createCommissionRule({name:String(form.get("name")??""),scopeType:String(form.get("scopeType")??"") as CommissionScope,scopeId:String(form.get("scopeId")??""),channel:String(form.get("channel")??"") as CommissionChannel|"all",rateBasisPoints:Math.round(ratePercent*100),priority:Number(form.get("priority")??0),feeBearer:String(form.get("feeBearer")??"platform") as "platform"|"vendor"|"proportional",effectiveFrom:String(form.get("effectiveFrom")??""),reason:String(form.get("reason")??""),actorUserId:user.$id,activate:String(form.get("action"))==="activate"}); return Response.redirect(publicAppUrl("/admin/finance/commissions?saved=1"),303); }
  catch(error){console.error("Commission rule creation failed",error);return Response.redirect(publicAppUrl("/admin/finance/commissions?error=rule"),303);}
}
