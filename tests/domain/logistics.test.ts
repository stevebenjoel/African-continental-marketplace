import test from "node:test"; import assert from "node:assert/strict"; import { calculateCarrierRate, canTransitionTracking } from "../../src/modules/logistics/domain/tracking.ts";
test("carrier rates use rounded-up shipment kilograms", () => { assert.equal(calculateCarrierRate(5000, 1200, 1501), 7400); });
test("tracking enforces forward movement and exception recovery", () => { assert.equal(canTransitionTracking("assigned", "accepted"), true); assert.equal(canTransitionTracking("accepted", "delivered"), false); assert.equal(canTransitionTracking("exception", "in_transit"), true); });
