import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { canonicalRedirectUrl } from "@/src/shared/http/canonical-origin";

export function proxy(request: NextRequest) {
  const target = canonicalRedirectUrl({
    appBaseUrl: process.env.APP_BASE_URL,
    nodeEnv: process.env.NODE_ENV,
    requestUrl: request.url,
    forwardedHost: request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  });
  return target ? NextResponse.redirect(target, 308) : NextResponse.next();
}

export const config = {
  // The image optimizer fetches this controlled route through the container's
  // internal host. Redirecting that self-request to the public canonical host
  // makes Next reject the response as an invalid upstream image in production.
  matcher: ["/((?!_next/static|_next/image|api/catalogue/media|favicon.ico|.*\\..*).*)"]
};
