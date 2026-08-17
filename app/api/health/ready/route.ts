import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await createAppwriteDatabaseClient().databases.get({ databaseId: env().APPWRITE_DATABASE_ID });
    return Response.json({ status: "ready" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
