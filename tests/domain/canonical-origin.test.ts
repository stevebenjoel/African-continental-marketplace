import assert from "node:assert/strict";
import test from "node:test";
import { canonicalRedirectUrl } from "../../src/shared/http/canonical-origin.ts";

test("production requests are redirected to the canonical host with path and query intact", () => {
  const target = canonicalRedirectUrl({
    appBaseUrl: "https://www.africancontinentalmarketplace.store",
    nodeEnv: "production",
    requestUrl: "http://127.0.0.1:3000/api/auth/oauth/google?returnTo=%2Faccount",
    forwardedHost: "africancontinentalmarketplace.store"
  });
  assert.equal(target?.toString(), "https://www.africancontinentalmarketplace.store/api/auth/oauth/google?returnTo=%2Faccount");
});

test("canonical and development requests continue without a redirect", () => {
  assert.equal(canonicalRedirectUrl({ appBaseUrl: "https://www.africancontinentalmarketplace.store", nodeEnv: "production", requestUrl: "http://127.0.0.1:3000/login", forwardedHost: "www.africancontinentalmarketplace.store" }), null);
  assert.equal(canonicalRedirectUrl({ appBaseUrl: "https://www.africancontinentalmarketplace.store", nodeEnv: "development", requestUrl: "http://localhost:3000/login", forwardedHost: "localhost:3000" }), null);
});
