import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeProductImageAlt, validProductImageSignature } from "../../src/modules/catalogue/domain/product-media.ts";

describe("product media validation", () => {
  it("recognizes supported image signatures", () => {
    assert.equal(validProductImageSignature(Uint8Array.from([0xff, 0xd8, 0xff]), "image/jpeg"), true);
    assert.equal(validProductImageSignature(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"), true);
    assert.equal(validProductImageSignature(Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]), "image/webp"), true);
    assert.equal(validProductImageSignature(Uint8Array.from([0x25, 0x50, 0x44, 0x46]), "image/png"), false);
  });

  it("normalizes useful accessible descriptions", () => {
    assert.equal(normalizeProductImageAlt("  Organic   cocoa powder pack  "), "Organic cocoa powder pack");
    assert.throws(() => normalizeProductImageAlt("x"));
  });
});
