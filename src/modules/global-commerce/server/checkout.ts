import "server-only";
import { ID, Query, type Models } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { syncImportedSupplierProduct } from "./repository";

type AppwriteRow = Models.Document & Record<string,unknown>;
type CartItem = AppwriteRow;
export type GlobalCheckoutValidation = Readonly<{ id:string; cartItemId:string; supplierId:string; supplierProductId:string; supplierVariantId:string; destinationCountry:string; quantity:number; sellableQuantity:number; supplierCostMinor:number; freightMinor:number; freightMethod:string }>;
const databaseId=()=>env().APPWRITE_DATABASE_ID;
const db=()=>createAppwriteDatabaseClient().databases;

export async function globalSellableQuantity(productId:string,variantId?:string){
  const databases=db(),mappings=await databases.listDocuments({databaseId:databaseId(),collectionId:"supplier_products",queries:[Query.equal("pacsmProductId",productId),Query.limit(1)]});
  const mapping=mappings.documents[0];if(!mapping)return null;
  const variants=await databases.listDocuments({databaseId:databaseId(),collectionId:"supplier_variants",queries:[Query.equal("supplierProductId",mapping.$id),...(variantId?[Query.equal("pacsmVariantId",variantId)]:[]),Query.limit(100)]});
  if(!variants.documents.length)return 0;
  const inventory=await databases.listDocuments({databaseId:databaseId(),collectionId:"supplier_inventory",queries:[Query.equal("supplierProductId",mapping.$id),Query.limit(500)]});
  const ids=new Set(variants.documents.map(row=>row.$id));return inventory.documents.filter(row=>ids.has(String(row.supplierVariantId))).reduce((sum,row)=>sum+Math.max(0,Number(row.sellableQuantity)),0);
}

export async function validateGlobalCheckout(userId:string,items:CartItem[],address:AppwriteRow){
  const globalItems=items.filter(item=>String(item.fulfilmentMethod)==="global_direct");if(!globalItems.length)return [];
  const databases=db(),flag=await databases.getDocument({databaseId:databaseId(),collectionId:"global_feature_flags",documentId:"globalCheckoutEnabled"});
  if(!flag.enabled)throw new Error("GLOBAL_CHECKOUT_DISABLED");
  const results:GlobalCheckoutValidation[]=[];
  for(const item of globalItems){
    const mappings=await databases.listDocuments({databaseId:databaseId(),collectionId:"supplier_products",queries:[Query.equal("pacsmProductId",String(item.productId)),Query.limit(1)]}),mapping=mappings.documents[0];
    if(!mapping)throw new Error("GLOBAL_MAPPING_MISSING");
    await syncImportedSupplierProduct(mapping.$id,`checkout:${userId}`);
    const variants=await databases.listDocuments({databaseId:databaseId(),collectionId:"supplier_variants",queries:[Query.equal("supplierProductId",mapping.$id),...(item.variantId?[Query.equal("pacsmVariantId",String(item.variantId))]:[]),Query.limit(2)]}),variant=variants.documents[0];
    if(!variant||variants.documents.length!==1||String(variant.status)!=="active")throw new Error("GLOBAL_VARIANT_UNAVAILABLE");
    const [stock,breakdowns]=await Promise.all([
      databases.listDocuments({databaseId:databaseId(),collectionId:"supplier_inventory",queries:[Query.equal("supplierVariantId",variant.$id),Query.limit(100)]}),
      databases.listDocuments({databaseId:databaseId(),collectionId:"global_price_breakdowns",queries:[Query.equal("supplierVariantId",variant.$id),Query.equal("status","current"),Query.orderDesc("calculatedAt"),Query.limit(1)]})
    ]),breakdown=breakdowns.documents[0];
    if(!breakdown||Number(breakdown.finalPriceMinor)!==Number(item.unitPriceMinor)||String(breakdown.transactionCurrency)!==String(item.currency))throw new Error("GLOBAL_PRICE_CHANGED");
    if(Number(breakdown.supplierCostMinor)!==Number(variant.supplierCostMinor)||String(mapping.status)==="price_review_required")throw new Error("GLOBAL_PRICE_REVIEW_REQUIRED");
    const quote=await databases.getDocument({databaseId:databaseId(),collectionId:"global_freight_quotes",documentId:String(breakdown.freightQuoteId)});
    if(String(quote.destinationCountry)!==String(address.countryCode))throw new Error("GLOBAL_DESTINATION_UNAVAILABLE");
    if(Date.parse(String(quote.expiresAt))<=Date.now())throw new Error("GLOBAL_FREIGHT_EXPIRED");
    const sellable=stock.documents.reduce((sum,row)=>sum+Math.max(0,Number(row.sellableQuantity)),0),quantity=Number(item.quantity);
    if(sellable<quantity)throw new Error("GLOBAL_STOCK_CHANGED");
    const now=new Date(),id=ID.unique();
    await databases.createDocument({databaseId:databaseId(),collectionId:"global_checkout_validations",documentId:id,permissions:[],data:{userId,cartItemId:item.$id,supplierId:mapping.supplierId,supplierProductId:mapping.$id,supplierVariantId:variant.$id,pacsmProductId:item.productId,pacsmVariantId:variant.pacsmVariantId,destinationCountry:address.countryCode,quantity,sellableQuantity:sellable,customerUnitPriceMinor:item.unitPriceMinor,currency:item.currency,supplierCostMinor:variant.supplierCostMinor,freightMinor:quote.amountMinor,freightMethod:quote.method,status:"eligible",reasonCodesJson:"[]",validatedAt:now.toISOString(),expiresAt:new Date(now.getTime()+10*60*1000).toISOString()}});
    results.push({id,cartItemId:item.$id,supplierId:String(mapping.supplierId),supplierProductId:mapping.$id,supplierVariantId:variant.$id,destinationCountry:String(address.countryCode),quantity,sellableQuantity:sellable,supplierCostMinor:Number(variant.supplierCostMinor),freightMinor:Number(quote.amountMinor),freightMethod:String(quote.method)});
  }
  return results;
}

export async function listGlobalCheckoutOperations(){const databases=db();const[validations,groups]=await Promise.all([databases.listDocuments({databaseId:databaseId(),collectionId:"global_checkout_validations",queries:[Query.orderDesc("validatedAt"),Query.limit(100)]}),databases.listDocuments({databaseId:databaseId(),collectionId:"global_fulfilment_groups",queries:[Query.orderDesc("createdAt"),Query.limit(100)]})]);return{validations,groups}}
