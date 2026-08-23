import test from "node:test";
import assert from "node:assert/strict";
import { accountGreeting } from "../../src/modules/auth/domain/display-name.ts";

test("account greeting uses the signed-in member's first name", () => {
  assert.equal(accountGreeting("stephen gbatigbi benjoel", "member@example.com"), "Hello, Stephen");
  assert.equal(accountGreeting("Priest", "priest@example.com"), "Hello, Priest");
});

test("account greeting safely falls back to the email name", () => {
  assert.equal(accountGreeting("", "benjoel@example.com"), "Hello, Benjoel");
  assert.equal(accountGreeting("<script>", "member@example.com"), "Hello, Script");
});
