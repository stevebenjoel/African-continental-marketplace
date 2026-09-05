import assert from "node:assert/strict";
import test from "node:test";
import { decryptSupplierCredential, encryptSupplierCredential, maskSupplierCredential } from "../../src/modules/global-commerce/domain/credential-crypto.ts";

test("supplier credentials are authenticated-encrypted and recoverable", () => { const key = Buffer.alloc(32, 7).toString("base64"), secret = { apiKey: "CJ-secret", refreshToken: "refresh" }, encrypted = encryptSupplierCredential(secret, key); assert.ok(!encrypted.includes("CJ-secret")); assert.deepEqual(decryptSupplierCredential(encrypted, key), secret); assert.throws(() => decryptSupplierCredential(encrypted, Buffer.alloc(32, 8).toString("base64"))); });
test("supplier credential masking reveals no usable secret", () => assert.equal(maskSupplierCredential("CJ123456789"), "CJ1••••••••789"));
