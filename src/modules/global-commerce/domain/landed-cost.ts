import { z } from "zod";

export const globalPricingRuleSchema = z.object({
  name:z.string().trim().min(3).max(180), destinationCountry:z.string().regex(/^[A-Z]{2}$/), transactionCurrency:z.string().regex(/^[A-Z]{3}$/),
  ruleType:z.enum(["percentage","fixed","percentage_plus_fixed","minimum_margin"]), markupBasisPoints:z.coerce.number().int().min(0).max(50000), fixedMarkupMinor:z.coerce.number().int().min(0).max(1_000_000_000),
  insuranceBasisPoints:z.coerce.number().int().min(0).max(10000), dutyBasisPoints:z.coerce.number().int().min(0).max(10000), taxBasisPoints:z.coerce.number().int().min(0).max(10000), paymentBasisPoints:z.coerce.number().int().min(0).max(10000), fxBufferBasisPoints:z.coerce.number().int().min(0).max(10000),
  platformCostMinor:z.coerce.number().int().min(0).max(1_000_000_000), localDeliveryMinor:z.coerce.number().int().min(0).max(1_000_000_000), otherCostMinor:z.coerce.number().int().min(0).max(1_000_000_000), minimumMarginBasisPoints:z.coerce.number().int().min(0).max(50000), minimumMarginMinor:z.coerce.number().int().min(0).max(1_000_000_000), description:z.string().trim().min(10).max(1000)
});
export type GlobalPricingRuleInput=z.infer<typeof globalPricingRuleSchema>;

export type LandedCostInput={supplierCostMinor:number;fxRateMillionths:number;internationalShippingMinor:number;rule:Omit<GlobalPricingRuleInput,"name"|"destinationCountry"|"transactionCurrency"|"description">};
const bps=(amount:number,rate:number)=>Math.round(amount*rate/10000);
export function calculateLandedCost(input:LandedCostInput){
  const source=Math.round(input.supplierCostMinor*input.fxRateMillionths/1_000_000); if(!Number.isSafeInteger(source)||source<1)throw new Error("Invalid converted supplier cost");
  const r=input.rule,insurance=bps(source,r.insuranceBasisPoints),duty=bps(source+input.internationalShippingMinor+insurance,r.dutyBasisPoints),taxBase=source+input.internationalShippingMinor+insurance+duty,tax=bps(taxBase,r.taxBasisPoints),fxBuffer=bps(source,r.fxBufferBasisPoints);
  const beforePayment=taxBase+tax+fxBuffer+r.platformCostMinor+r.localDeliveryMinor+r.otherCostMinor,payment=bps(beforePayment,r.paymentBasisPoints),landed=beforePayment+payment;
  const configured=r.ruleType==="fixed"?r.fixedMarkupMinor:r.ruleType==="percentage"?bps(landed,r.markupBasisPoints):r.ruleType==="minimum_margin"?0:bps(landed,r.markupBasisPoints)+r.fixedMarkupMinor;
  const protectedMargin=Math.max(configured,bps(landed,r.minimumMarginBasisPoints),r.minimumMarginMinor),finalPriceMinor=landed+protectedMargin;
  if(!Number.isSafeInteger(finalPriceMinor)||finalPriceMinor<=landed)throw new Error("Price does not satisfy margin protection");
  return{supplierCostMinor:input.supplierCostMinor,convertedSupplierCostMinor:source,internationalShippingMinor:input.internationalShippingMinor,insuranceMinor:insurance,dutyMinor:duty,taxMinor:tax,paymentProcessingMinor:payment,fxBufferMinor:fxBuffer,platformCostMinor:r.platformCostMinor,localDeliveryMinor:r.localDeliveryMinor,otherCostMinor:r.otherCostMinor,landedCostMinor:landed,marginMinor:protectedMargin,marginBasisPoints:Math.round(protectedMargin*10000/landed),finalPriceMinor};
}
