import { requireReconciliationAccess } from "@/src/modules/reconciliation/server/access";
import { getReconciliationDashboard } from "@/src/modules/reconciliation/server/engine";

const csv=(value:unknown)=>`"${String(value??"").replaceAll('"','""')}"`;
export async function GET(request:Request){await requireReconciliationAccess();const date=new URL(request.url).searchParams.get("date")||undefined,data=await getReconciliationDashboard(date),rows=[["snapshot_date","rule","severity","entity_type","entity_id","owner","status","description","resolution"],...data.exceptions.map(item=>[data.snapshotDate,item.ruleCode,item.severity,item.entityType,item.entityId,item.assignedRole,item.status,item.description,item.resolution])];return new Response(rows.map(row=>row.map(csv).join(",")).join("\r\n"),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="pac-sm-reconciliation-${data.snapshotDate}.csv"`,"Cache-Control":"no-store"}})}
