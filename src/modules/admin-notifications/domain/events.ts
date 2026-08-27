import type { AdminRole } from "@/src/modules/authorization/domain/admin-roles";

export type AdminNotificationPriority = "information"|"action"|"critical";
export type AdminNotificationEvent = {
  eventType:string; priority:AdminNotificationPriority; title:string; body:string;
  entityType:string; entityId:string; href:string; roles:readonly AdminRole[];
};

export const adminNotificationRecipients:Record<string,readonly AdminRole[]> = {
  order_created:["order_fulfilment_manager"],payment_captured:["finance_officer","order_fulfilment_manager"],
  order_processing:["order_fulfilment_manager","warehouse_manager"],order_dispatched:["order_fulfilment_manager","logistics_manager","logistics_dispatcher"],
  order_delivered:["order_fulfilment_manager","finance_officer"],return_requested:["support_officer","order_fulfilment_manager"],
  dispute_opened:["support_officer"],reconciliation_exception:["finance_officer","order_fulfilment_manager"]
};
