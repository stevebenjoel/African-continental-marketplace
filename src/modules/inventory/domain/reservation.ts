export type OrderStockRequirement={offerId:string;quantity:number;purchaseType?:string};
export const requiresPhysicalInventory=(purchaseType?:string)=>!["preorder","white_label"].includes(purchaseType??"standard");
export function reservationsCoverStandardItems(items:OrderStockRequirement[],reservedByOffer:ReadonlyMap<string,number>){return items.filter(item=>requiresPhysicalInventory(item.purchaseType)).every(item=>Number.isSafeInteger(item.quantity)&&item.quantity>0&&(reservedByOffer.get(item.offerId)??0)>=item.quantity)}
