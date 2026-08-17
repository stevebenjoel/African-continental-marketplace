import test from "node:test"; import assert from "node:assert/strict"; import { REGIONS, flagForCountry, isCurrency, isLanguage } from "../../src/modules/localization/domain/regions.ts";
test("regional defaults and flags are deterministic", () => { assert.equal(REGIONS.NG.currency, "NGN"); assert.equal(REGIONS.KE.language, "sw"); assert.equal(flagForCountry("GH"), "🇬🇭"); });
test("only supported preferences are accepted", () => { assert.equal(isLanguage("fr"), true); assert.equal(isLanguage("xx"), false); assert.equal(isCurrency("ZAR"), true); assert.equal(isCurrency("BTC"), false); });
