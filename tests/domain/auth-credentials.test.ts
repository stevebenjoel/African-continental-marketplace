import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loginSchema, registrationSchema } from "../../src/modules/auth/domain/credentials.ts";

describe("authentication input rules", () => {
  it("normalizes email addresses", () => {
    const parsed = loginSchema.parse({ email: "  Buyer@Example.COM ", password: "secret" });
    assert.equal(parsed.email, "buyer@example.com");
  });

  it("requires a strong registration password", () => {
    assert.throws(() => registrationSchema.parse({ name: "Buyer", email: "buyer@example.com", password: "short" }));
    assert.doesNotThrow(() => registrationSchema.parse({ name: "Buyer", email: "buyer@example.com", password: "Continental2026" }));
  });
});
