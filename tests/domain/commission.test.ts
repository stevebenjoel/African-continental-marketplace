import test from "node:test";
import assert from "node:assert/strict";
import { calculateCommission, vendorRateBasisPoints } from "../../src/modules/finance/domain/commission.ts";

test("allocates PAC-SM and vendor amounts without losing a minor unit",()=>{const result=calculateCommission(10001,0,1250);assert.equal(result.pacsmMinor,1250);assert.equal(result.vendorMinor,8751);assert.equal(result.pacsmMinor+result.vendorMinor,result.commissionBaseMinor)});
test("removes recorded discounts from the commission base",()=>{assert.deepEqual(calculateCommission(10000,1000,1000),{grossMinor:10000,discountMinor:1000,commissionBaseMinor:9000,pacsmMinor:900,vendorMinor:8100})});
test("derives the vendor percentage from the PAC-SM percentage",()=>assert.equal(vendorRateBasisPoints(1250),8750));
test("rejects invalid percentages and amounts",()=>{assert.throws(()=>calculateCommission(1000,0,10001));assert.throws(()=>calculateCommission(1000,1001,1000))});
