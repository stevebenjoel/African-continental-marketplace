export const GLOBAL_CHECKOUT_ERRORS:Record<string,string>={
  GLOBAL_CHECKOUT_DISABLED:"Global checkout is not open yet.",
  GLOBAL_MAPPING_MISSING:"This global product is no longer linked to its supplier.",
  GLOBAL_VARIANT_UNAVAILABLE:"The selected global-product variant is no longer available.",
  GLOBAL_PRICE_CHANGED:"The global-product price changed. Please return to the product page before paying.",
  GLOBAL_PRICE_REVIEW_REQUIRED:"PAC-SM is reviewing a supplier price change. This item cannot be paid for yet.",
  GLOBAL_DESTINATION_UNAVAILABLE:"The selected global product cannot currently be delivered to that address.",
  GLOBAL_FREIGHT_EXPIRED:"The international delivery quote expired and must be refreshed before payment.",
  GLOBAL_STOCK_CHANGED:"The supplier no longer has enough buffered stock for the requested quantity."
};
export const globalCheckoutErrorMessage=(code?:string)=>code&&GLOBAL_CHECKOUT_ERRORS[code]||"Checkout failed safely; your cart remains unchanged.";
export const globalCheckoutErrorCode=(error:unknown)=>error instanceof Error&&error.message in GLOBAL_CHECKOUT_ERRORS?error.message:"checkout_failed";
