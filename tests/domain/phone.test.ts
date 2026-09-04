import test from "node:test";
import assert from "node:assert/strict";
import { normalizePhoneToE164 } from "../../src/modules/localization/domain/phone.ts";

test("normalizes African local telephone numbers to E.164", () => {
  assert.equal(normalizePhoneToE164("0906 679 4666", "NG"), "+2349066794666");
  assert.equal(normalizePhoneToE164("024 123 4567", "GH"), "+233241234567");
});

test("preserves a valid international telephone number", () => assert.equal(normalizePhoneToE164("+254 712 345 678", "KE"), "+254712345678"));
test("rejects malformed telephone numbers and unknown countries", () => {
  assert.throws(() => normalizePhoneToE164("12", "NG"));
  assert.throws(() => normalizePhoneToE164("09066794666", "XX"));
  assert.throws(() => normalizePhoneToE164("+233241234567", "NG"));
});
