export const ADMIN_ROLES = ["offtaker_verification","seller_onboarding_manager","order_fulfilment_manager","warehouse_manager","warehouse_receiving","warehouse_picker","warehouse_packer","finance_officer","support_officer","category_manager","vendor_verification","trade_compliance","logistics_manager","logistics_dispatcher"] as const;
export type AdminRole = typeof ADMIN_ROLES[number];
export const isAdminRole=(value:string):value is AdminRole=>(ADMIN_ROLES as readonly string[]).includes(value);
export const selectAdminRoles = (values: readonly string[]): AdminRole[] => Array.from(new Set(values.filter(isAdminRole)));
export const hasAdminRole=(labels:readonly string[]|undefined,roles:readonly AdminRole[])=>roles.some(role=>labels?.includes(role));
export const isWarehouseStaff=(labels:readonly string[]|undefined)=>hasAdminRole(labels,["warehouse_manager","warehouse_receiving","warehouse_picker","warehouse_packer"]);
export type WarehouseAction="receive"|"putaway"|"create_pick"|"pick"|"pack";
export function hasWarehousePermission(labels:readonly string[]|undefined,action:WarehouseAction){if(labels?.includes("superadmin")||labels?.includes("warehouse_manager"))return true;const required:Record<WarehouseAction,AdminRole[]>={receive:["warehouse_receiving"],putaway:["warehouse_receiving"],create_pick:[],pick:["warehouse_picker"],pack:["warehouse_packer"]};return hasAdminRole(labels,required[action])}
