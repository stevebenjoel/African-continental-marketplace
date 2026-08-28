export const ADMIN_ROLES = ["offtaker_verification","seller_onboarding_manager","order_fulfilment_manager","warehouse_manager","warehouse_receiving","warehouse_picker","warehouse_packer","finance_officer","support_officer","category_manager","vendor_verification","trade_compliance","logistics_manager","logistics_dispatcher","academy_admin","academy_content_manager","academy_instructor","academy_assessor"] as const;
export type AdminRole = typeof ADMIN_ROLES[number];
export const ADMIN_ROLE_LABELS: Record<AdminRole,string> = {
  offtaker_verification:"offtakerVerification",seller_onboarding_manager:"sellerOnboardingManager",order_fulfilment_manager:"orderFulfilmentManager",warehouse_manager:"warehouseManager",warehouse_receiving:"warehouseReceiving",warehouse_picker:"warehousePicker",warehouse_packer:"warehousePacker",finance_officer:"financeOfficer",support_officer:"supportOfficer",category_manager:"categoryManager",vendor_verification:"vendorVerification",trade_compliance:"tradeCompliance",logistics_manager:"logisticsManager",logistics_dispatcher:"logisticsDispatcher",academy_admin:"academyAdmin",academy_content_manager:"academyContentManager",academy_instructor:"academyInstructor",academy_assessor:"academyAssessor"
};
export const ADMIN_ROLE_INFO: Record<AdminRole,{name:string;description:string;href?:string}> = {
  offtaker_verification:{name:"Off-taker Verification Manager",description:"Review off-taker onboarding, schedules, milestones and disputes.",href:"/admin/offtakers"},
  seller_onboarding_manager:{name:"Seller Onboarding Manager",description:"Create assisted seller accounts, vendor records and storefronts.",href:"/onboarding/sellers"},
  order_fulfilment_manager:{name:"Order Fulfilment Manager",description:"Manage paid orders from processing through delivery.",href:"/operations"},
  warehouse_manager:{name:"Warehouse Manager",description:"Coordinate receiving, put-away, picking and packing.",href:"/admin/warehousing"},
  warehouse_receiving:{name:"Warehouse Receiving Officer",description:"Receive inbound stock and complete put-away.",href:"/admin/warehousing"},
  warehouse_picker:{name:"Warehouse Picker",description:"Complete assigned warehouse pick tasks.",href:"/admin/warehousing"},
  warehouse_packer:{name:"Warehouse Packing Officer",description:"Pack completed picks for dispatch.",href:"/admin/warehousing"},
  finance_officer:{name:"Finance Officer",description:"Assigned financial operations responsibility."},
  support_officer:{name:"Customer Support Officer",description:"Assigned customer-support responsibility."},
  category_manager:{name:"Category Manager",description:"Assigned catalogue and category responsibility."},
  vendor_verification:{name:"Vendor Verification Officer",description:"Assigned vendor KYC and KYB review responsibility."},
  trade_compliance:{name:"Trade Compliance Officer",description:"Manage trade passports, standards and regulatory controls.",href:"/admin/trade"},
  logistics_manager:{name:"Logistics Manager",description:"Review carriers and oversee shipment assignments.",href:"/admin/logistics"},
  logistics_dispatcher:{name:"Logistics Dispatcher",description:"Assign verified carriers and coordinate dispatch.",href:"/admin/logistics"},
  academy_admin:{name:"Academy Administrator",description:"Manage Academy delivery, enrolments, staff, reporting and credentials.",href:"/admin/academy"},
  academy_content_manager:{name:"Academy Content Manager",description:"Maintain versioned courses, modules, lessons and learning resources.",href:"/admin/academy"},
  academy_instructor:{name:"Academy Instructor",description:"Monitor learners, provide guidance and review practical work.",href:"/admin/academy"},
  academy_assessor:{name:"Academy Assessor",description:"Grade projects, assessments and learner defences.",href:"/admin/academy"}
};
export const isAdminRole=(value:string):value is AdminRole=>(ADMIN_ROLES as readonly string[]).includes(value);
export const selectAdminRoles = (values: readonly string[]): AdminRole[] => Array.from(new Set(values.filter(isAdminRole)));
export const adminRoleLabel=(role:AdminRole)=>ADMIN_ROLE_LABELS[role];
export const hasAdminRole=(labels:readonly string[]|undefined,roles:readonly AdminRole[])=>roles.some(role=>labels?.includes(adminRoleLabel(role))||labels?.includes(role));
export const grantedAdminRoles=(labels:readonly string[]|undefined)=>ADMIN_ROLES.filter(role=>hasAdminRole(labels,[role]));
export const isWarehouseStaff=(labels:readonly string[]|undefined)=>hasAdminRole(labels,["warehouse_manager","warehouse_receiving","warehouse_picker","warehouse_packer"]);
export type WarehouseAction="receive"|"putaway"|"create_pick"|"pick"|"pack";
export function hasWarehousePermission(labels:readonly string[]|undefined,action:WarehouseAction){if(labels?.includes("superadmin")||hasAdminRole(labels,["warehouse_manager"]))return true;const required:Record<WarehouseAction,AdminRole[]>={receive:["warehouse_receiving"],putaway:["warehouse_receiving"],create_pick:[],pick:["warehouse_picker"],pack:["warehouse_packer"]};return hasAdminRole(labels,required[action])}
