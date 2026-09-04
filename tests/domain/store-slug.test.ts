import assert from "node:assert/strict";
import test from "node:test";
import { storeSlugCandidates } from "../../src/modules/storefront/domain/store-slug.ts";

test("store handles survive production URL encoding", () => {
  assert.deepEqual(storeSlugCandidates("%40diplomats"), ["@diplomats", "%40diplomats"]);
  assert.deepEqual(storeSlugCandidates("@Diplomats"), ["@diplomats"]);
  assert.deepEqual(storeSlugCandidates("diplomats-stores"), ["diplomats-stores"]);
});

test("malformed and blank storefront slugs fail safely", () => {
  assert.deepEqual(storeSlugCandidates("%E0%A4%A"), ["%e0%a4%a"]);
  assert.deepEqual(storeSlugCandidates("   "), []);
});
