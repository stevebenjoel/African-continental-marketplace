import assert from "node:assert/strict";
import test from "node:test";
import { extractAppwriteSessionSecret } from "../../src/modules/auth/domain/appwrite-session-cookie.ts";

test("extracts and decodes only the expected Appwrite project session cookie", () => {
  assert.equal(extractAppwriteSessionSecret([
    "unrelated=value; Path=/",
    "a_session_project-1=secret%2Evalue; Path=/; HttpOnly; SameSite=Lax"
  ], "project-1"), "secret.value");
  assert.equal(extractAppwriteSessionSecret(["a_session_other=secret; Path=/"], "project-1"), null);
});
