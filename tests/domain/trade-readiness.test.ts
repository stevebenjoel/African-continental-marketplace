import test from "node:test";
import assert from "node:assert/strict";
import { calculateTradeReadiness, isTradePassportAction } from "../../src/modules/trade/domain/readiness.ts";

test("trade readiness is deterministic and capped", () => {
  assert.equal(calculateTradeReadiness({ exporterNumber: "EXP-1", targetCountries: ["GH"], productCategories: ["Food"], incoterms: ["CIF"], transportModes: ["Sea"], certificationCount: 3, documentCount: 5 }), 100);
  assert.equal(calculateTradeReadiness({ targetCountries: [], productCategories: [], incoterms: [], transportModes: [], certificationCount: 0, documentCount: 0 }), 0);
});

test("only controlled passport review actions are accepted", () => {
  assert.equal(isTradePassportAction("approve"), true);
  assert.equal(isTradePassportAction("delete"), false);
});
