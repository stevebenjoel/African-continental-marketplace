export function canonicalRedirectUrl(input: {
  appBaseUrl?: string;
  nodeEnv?: string;
  requestUrl: string;
  forwardedHost?: string | null;
}): URL | null {
  if (input.nodeEnv !== "production" || !input.appBaseUrl) return null;

  const canonical = new URL(input.appBaseUrl);
  const request = new URL(input.requestUrl);
  const forwardedHost = input.forwardedHost?.split(",", 1)[0]?.trim().toLowerCase();
  const incomingHost = forwardedHost || request.host.toLowerCase();
  if (incomingHost === canonical.host.toLowerCase()) return null;

  return new URL(`${request.pathname}${request.search}`, canonical);
}
