import assert from "node:assert/strict";
import test from "node:test";
import { registrationWelcomeEmail } from "../../src/modules/notifications/domain/email-content.ts";

test("registration email escapes user-controlled HTML", () => {
  const email = registrationWelcomeEmail({ name: '<script>alert("x")</script>', accountUrl: "https://example.com/account?a=1&b=2" });
  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.html, /&lt;script&gt;/);
  assert.match(email.html, /a=1&amp;b=2/);
  assert.match(email.text, /https:\/\/example\.com\/account/);
});
