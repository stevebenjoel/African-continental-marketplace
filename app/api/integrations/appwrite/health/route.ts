import { createAppwriteAdminClient } from "@/src/integrations/appwrite/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { users } = createAppwriteAdminClient("auth");
    await users.list({ total: false });
    return Response.json(
      { status: "connected", service: "appwrite" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { status: "unavailable", service: "appwrite" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
