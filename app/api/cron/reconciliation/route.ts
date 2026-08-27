import { env } from "@/src/shared/config/env";
import { runReconciliation } from "@/src/modules/reconciliation/server/engine";
export async function POST(request:Request){const secret=env().RECONCILIATION_CRON_SECRET,authorization=request.headers.get("authorization");if(!secret||authorization!==`Bearer ${secret}`)return new Response("Unauthorized",{status:401});const snapshotId=await runReconciliation("system-reconciliation");return Response.json({ok:true,snapshotId})}
