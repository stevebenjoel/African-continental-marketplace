import { env } from "@/src/shared/config/env";
import { releaseExpiredReservations } from "@/src/modules/inventory/server/integrity";

export async function POST(request:Request){const secret=env().RECONCILIATION_CRON_SECRET,authorization=request.headers.get("authorization");if(!secret||authorization!==`Bearer ${secret}`)return new Response("Unauthorized",{status:401});return Response.json({ok:true,...await releaseExpiredReservations()})}
