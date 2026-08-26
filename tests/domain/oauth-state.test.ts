import assert from "node:assert/strict";
import test from "node:test";
import { createSignedOAuthState, verifySignedOAuthState } from "../../src/modules/auth/domain/oauth-state.ts";

const secret = "a-test-secret-that-is-never-used-in-production";

test("signed OAuth state preserves a safe return path without browser cookies", () => {
  const token = createSignedOAuthState({ secret, returnTo: "/wholesale/negotiations?status=open", now: 1_000_000 });
  assert.equal(verifySignedOAuthState({ token, secret, now: 1_001_000 })?.returnTo, "/wholesale/negotiations?status=open");
});

test("OAuth state rejects tampering, expiry and external return paths", () => {
  const token = createSignedOAuthState({ secret, returnTo: "/account", now: 1_000_000 });
  assert.equal(verifySignedOAuthState({ token: `${token}x`, secret, now: 1_001_000 }), null);
  assert.equal(verifySignedOAuthState({ token, secret, now: 1_000_000 + 11 * 60 * 1000 }), null);
  const external = createSignedOAuthState({ secret, returnTo: "//attacker.example", now: 1_000_000 });
  assert.equal(verifySignedOAuthState({ token: external, secret, now: 1_001_000 }), null);
});
