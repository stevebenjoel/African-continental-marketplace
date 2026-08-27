import "server-only";
import { ID, Query, type Models } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { publishAdminNotificationSafely } from "@/src/modules/admin-notifications/server/publisher";

type Doc=Models.Document;
export type ReconciliationMetrics={orders:number;paidOrders:number;pendingPayment:number;cancelledOrders:number;grossOrderValueMinor:number;capturedPayments:number;failedPayments:number;pendingPayments:number;processing:number;awaitingDispatch:number;inTransit:number;delivered:number;openComplaints:number;openReturns:number;refunds:number;exceptionCount:number};
type ExceptionInput={ruleCode:string;severity:"critical"|"warning";entityType:string;entityId:string;description:string;assignedRole:string};
const localDate=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const range=(date:string)=>({start:new Date(`${date}T00:00:00+01:00`).toISOString(),end:new Date(`${date}T23:59:59.999+01:00`).toISOString()});
const list=(collectionId:string,date:string,dateField:string)=>{const {start,end}=range(date);return createAppwriteDatabaseClient().databases.listDocuments({databaseId:env().APPWRITE_DATABASE_ID,collectionId,queries:[Query.greaterThanEqual(dateField,start),Query.lessThanEqual(dateField,end),Query.limit(5000)]})};

export async function calculateReconciliation(snapshotDate=localDate()){
  const [orders,payments,vendorOrders,shipments,disputes,returns,refunds]=await Promise.all([list("orders",snapshotDate,"createdAt"),list("payments",snapshotDate,"createdAt"),list("vendor_orders",snapshotDate,"createdAt"),list("shipments",snapshotDate,"dispatchedAt"),list("disputes",snapshotDate,"createdAt"),list("return_requests",snapshotDate,"requestedAt"),list("refunds",snapshotDate,"createdAt")]);
  const paymentByOrder=new Map(payments.documents.map(payment=>[String(payment.orderId),payment])),childrenByOrder=new Map<string,Doc[]>(),shipmentByVendorOrder=new Map(shipments.documents.map(shipment=>[String(shipment.vendorOrderId),shipment]));
  for(const child of vendorOrders.documents)childrenByOrder.set(String(child.orderId),[...(childrenByOrder.get(String(child.orderId))??[]),child]);
  const exceptions:ExceptionInput[]=[];
  for(const order of orders.documents){const payment=paymentByOrder.get(order.$id),children=childrenByOrder.get(order.$id)??[],status=String(order.status);if(payment?.status==="captured"&&status==="pending_payment")exceptions.push({ruleCode:"CAPTURED_PAYMENT_UNPAID_ORDER",severity:"critical",entityType:"order",entityId:order.$id,description:"Payment is captured but the order remains pending payment.",assignedRole:"finance_officer"});if(status!=="pending_payment"&&status!=="cancelled"&&payment?.status!=="captured")exceptions.push({ruleCode:"PROGRESSED_ORDER_NO_CAPTURE",severity:"critical",entityType:"order",entityId:order.$id,description:"Order progressed without a captured payment record.",assignedRole:"finance_officer"});if(status!=="pending_payment"&&!children.length)exceptions.push({ruleCode:"PAID_ORDER_NO_VENDOR_ORDERS",severity:"critical",entityType:"order",entityId:order.$id,description:"Paid order has no vendor fulfilment orders.",assignedRole:"order_fulfilment_manager"});}
  for(const child of vendorOrders.documents){const shipment=shipmentByVendorOrder.get(child.$id),status=String(child.status);if(["dispatched","delivered"].includes(status)&&!shipment)exceptions.push({ruleCode:"DISPATCHED_ORDER_NO_SHIPMENT",severity:"critical",entityType:"vendor_order",entityId:child.$id,description:"Dispatched order has no shipment record.",assignedRole:"logistics_manager"});if(status==="delivered"&&shipment&&shipment.status!=="delivered")exceptions.push({ruleCode:"DELIVERED_ORDER_SHIPMENT_OPEN",severity:"warning",entityType:"vendor_order",entityId:child.$id,description:"Vendor order is delivered while its shipment remains open.",assignedRole:"order_fulfilment_manager"});}
  const metrics:ReconciliationMetrics={orders:orders.total,paidOrders:orders.documents.filter(x=>x.status!=="pending_payment"&&x.status!=="cancelled").length,pendingPayment:orders.documents.filter(x=>x.status==="pending_payment").length,cancelledOrders:orders.documents.filter(x=>x.status==="cancelled").length,grossOrderValueMinor:orders.documents.reduce((sum,x)=>sum+Number(x.totalMinor),0),capturedPayments:payments.documents.filter(x=>x.status==="captured").length,failedPayments:payments.documents.filter(x=>x.status==="failed").length,pendingPayments:payments.documents.filter(x=>x.status==="pending").length,processing:vendorOrders.documents.filter(x=>["new","processing"].includes(String(x.status))).length,awaitingDispatch:vendorOrders.documents.filter(x=>x.status==="packed").length,inTransit:shipments.documents.filter(x=>x.status==="in_transit").length,delivered:vendorOrders.documents.filter(x=>x.status==="delivered").length,openComplaints:disputes.documents.filter(x=>!["resolved","rejected"].includes(String(x.status))).length,openReturns:returns.documents.filter(x=>!["completed","rejected"].includes(String(x.status))).length,refunds:refunds.total,exceptionCount:exceptions.length};
  return{snapshotDate,metrics,exceptions};
}

export async function runReconciliation(actorUserId:string,snapshotDate=localDate()){
  const result=await calculateReconciliation(snapshotDate),db=createAppwriteDatabaseClient().databases,databaseId=env().APPWRITE_DATABASE_ID,generatedAt=new Date().toISOString();
  const existing=await db.listDocuments({databaseId,collectionId:"reconciliation_snapshots",queries:[Query.equal("snapshotDate",snapshotDate),Query.limit(1)]});
  const data={snapshotDate,status:result.exceptions.length?"exceptions":"balanced",metrics:JSON.stringify(result.metrics),exceptionCount:result.exceptions.length,generatedBy:actorUserId,generatedAt};
  const snapshot=existing.documents[0]?await db.updateDocument({databaseId,collectionId:"reconciliation_snapshots",documentId:existing.documents[0].$id,data}):await db.createDocument({databaseId,collectionId:"reconciliation_snapshots",documentId:ID.unique(),permissions:[],data});
  const recorded=await db.listDocuments({databaseId,collectionId:"reconciliation_exceptions",queries:[Query.equal("snapshotId",snapshot.$id),Query.limit(5000)]}),keys=new Set(recorded.documents.map(item=>`${item.ruleCode}:${item.entityId}`));
  for(const item of result.exceptions){if(keys.has(`${item.ruleCode}:${item.entityId}`))continue;await db.createDocument({databaseId,collectionId:"reconciliation_exceptions",documentId:ID.unique(),permissions:[],data:{snapshotId:snapshot.$id,...item,status:"open",createdAt:generatedAt}})}
  if(result.exceptions.length)await publishAdminNotificationSafely({eventType:"reconciliation_exception",priority:"critical",title:"Daily reconciliation needs attention",body:`${result.exceptions.length} exception${result.exceptions.length===1?"":"s"} were detected for ${snapshotDate}.`,entityType:"reconciliation_snapshot",entityId:snapshot.$id,href:`/admin/reconciliation?date=${encodeURIComponent(snapshotDate)}`,roles:["finance_officer","order_fulfilment_manager"]});
  return snapshot.$id;
}

export async function getReconciliationDashboard(snapshotDate=localDate()){
  const db=createAppwriteDatabaseClient().databases,databaseId=env().APPWRITE_DATABASE_ID,snapshots=await db.listDocuments({databaseId,collectionId:"reconciliation_snapshots",queries:[Query.equal("snapshotDate",snapshotDate),Query.limit(1)]}),snapshot=snapshots.documents[0];
  if(!snapshot)return{snapshotDate,snapshot:null,metrics:(await calculateReconciliation(snapshotDate)).metrics,exceptions:[]};
  const exceptions=await db.listDocuments({databaseId,collectionId:"reconciliation_exceptions",queries:[Query.equal("snapshotId",snapshot.$id),Query.orderDesc("createdAt"),Query.limit(500)]});
  return{snapshotDate,snapshot,metrics:JSON.parse(String(snapshot.metrics)) as ReconciliationMetrics,exceptions:exceptions.documents};
}
