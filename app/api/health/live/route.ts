export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok", service: "pac-sm", timestamp: new Date().toISOString() });
}
