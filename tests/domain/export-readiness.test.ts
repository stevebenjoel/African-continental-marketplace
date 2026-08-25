import test from"node:test";import assert from"node:assert/strict";import{applicableRules,assessMarket,evidenceState}from"../../src/modules/export-readiness/domain/engine.ts";
const rule={id:"r1",destinationCountry:"GB",originCountry:"NG",hsPrefix:"64",requirementCode:"ORIGIN_PROOF",requirementType:"ORIGIN_REQUIREMENT",legalStatus:"MANDATORY",title:"Verified proof of origin"};
test("rules are corridor and HS specific",()=>assert.equal(applicableRules({originCountry:"NG",destinationCountry:"GB",hs6:"640399",categoryId:"fashion"},[rule]).length,1));
test("mandatory evidence failure overrides score",()=>{const result=assessMarket({rules:[rule],evidence:[],classificationStatus:"VENDOR_CONFIRMED",classificationConfidence:98});assert.equal(result.status,"NOT_READY")});
test("expired evidence cannot satisfy readiness",()=>assert.equal(evidenceState({requirementCode:"X",status:"verified",expiresAt:"2020-01-01"}),"expired"));
