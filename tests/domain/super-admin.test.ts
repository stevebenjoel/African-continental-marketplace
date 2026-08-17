import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSuperAdmin, SUPER_ADMIN_LABEL } from "../../src/modules/authorization/domain/super-admin.ts";

describe("super-admin authorization", () => {
  it("requires the exact server-assigned label", () => {
    assert.equal(isSuperAdmin([SUPER_ADMIN_LABEL]), true);
    assert.equal(isSuperAdmin(["admin"]), false);
    assert.equal(isSuperAdmin(undefined), false);
  });
});
