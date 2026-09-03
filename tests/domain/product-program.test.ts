import test from "node:test";
import assert from "node:assert/strict";
import { preorderIsOpen, validateProgramInput } from "../../src/modules/catalogue/domain/product-program.ts";

test("an enabled pre-order is open only inside its window with capacity", () => {
  const program = { preorderEnabled: true, preorderOpensAt: "2026-01-01T00:00:00.000Z", preorderClosesAt: "2026-12-31T00:00:00.000Z", preorderCapacity: 10, preorderReserved: 4 };
  assert.equal(preorderIsOpen(program, new Date("2026-06-01T00:00:00.000Z")), true);
  assert.equal(preorderIsOpen({ ...program, preorderReserved: 10 }, new Date("2026-06-01T00:00:00.000Z")), false);
});

test("white-label configuration requires production terms", () => {
  assert.throws(() => validateProgramInput({ preorderEnabled: false, whiteLabelEnabled: true }), /MOQ/);
  assert.doesNotThrow(() => validateProgramInput({ preorderEnabled: false, whiteLabelEnabled: true, whiteLabelMinimumQuantity: 100, whiteLabelLeadDays: 21, whiteLabelOptions: "Custom logo and carton" }));
});
