import test from "node:test";
import assert from "node:assert/strict";
import { productDraftRequestSchema, productDraftSchema } from "../../src/modules/catalogue/domain/product-ai-draft.ts";
test("normalizes safe product draft input", () => { const input = productDraftRequestSchema.parse({ name: "  Roasted Cashews  ", knownFacts: "500 g pouch" }); assert.equal(input.name, "Roasted Cashews"); assert.equal(input.category, ""); });
test("accepts a complete structured product draft", () => { const draft = productDraftSchema.parse({ suggestedSlug: "roasted-cashews", description: "Roasted cashews presented in a convenient package for everyday retail purchasing.", specifications: ["Product type: cashews", "Preparation: roasted", "Pack format: pouch"], variantName: "Standard pack", variantAttributes: "Pack size: confirm before publishing", searchKeywords: ["cashews", "roasted nuts", "snacks"], questionsForSeller: ["What is the verified country of origin?"] }); assert.equal(draft.specifications.length, 3); });
test("rejects malformed structured output", () => { assert.equal(productDraftSchema.safeParse({ suggestedSlug: "Bad Slug", description: "short" }).success, false); });
