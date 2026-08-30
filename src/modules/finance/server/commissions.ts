import "server-only";
import { ID, Query, type Databases, type Models } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { calculateCommission } from "@/src/modules/finance/domain/commission";

export type CommissionChannel = "retail" | "wholesale" | "negotiated_wholesale" | "procurement" | "offtake" | "pacsm_products";
export type CommissionScope = "global" | "channel" | "category" | "vendor" | "product" | "platform_owned";

type ResolveInput = { vendorId: string; productId: string; categoryId: string; channel: CommissionChannel; at?: string };

const specificity: Record<CommissionScope, number> = { global: 0, channel: 1, category: 2, vendor: 3, product: 4, platform_owned: 5 };

function applies(rule: Models.Document & Record<string, unknown>, input: ResolveInput, at: number) {
  const effectiveFrom = new Date(String(rule.effectiveFrom)).getTime();
  const effectiveTo = rule.effectiveTo ? new Date(String(rule.effectiveTo)).getTime() : Number.POSITIVE_INFINITY;
  if (!["active", "scheduled"].includes(String(rule.status)) || effectiveFrom > at || effectiveTo <= at) return false;
  const channel = String(rule.channel ?? "all");
  if (channel !== "all" && channel !== input.channel) return false;
  const scope = String(rule.scopeType ?? "global") as CommissionScope;
  const scopeId = String(rule.scopeId ?? "");
  if (scope === "global" || scope === "channel") return true;
  if (scope === "platform_owned") return input.vendorId === "pacsm-platform";
  if (scope === "vendor") return scopeId === input.vendorId;
  if (scope === "product") return scopeId === input.productId;
  return scope === "category" && scopeId === input.categoryId;
}

export async function resolveCommissionRule(databases: Databases, databaseId: string, transactionId: string, input: ResolveInput) {
  const at = new Date(input.at ?? new Date().toISOString()).getTime();
  const result = await databases.listDocuments({ databaseId, collectionId: "commission_rules", queries: [Query.equal("status", ["active", "scheduled"]), Query.limit(500)], transactionId });
  const candidates = result.documents.filter(rule => applies(rule, input, at)).sort((a, b) => {
    const scopeDifference = specificity[String(b.scopeType ?? "global") as CommissionScope] - specificity[String(a.scopeType ?? "global") as CommissionScope];
    return scopeDifference || Number(b.priority ?? 0) - Number(a.priority ?? 0) || new Date(String(b.effectiveFrom)).getTime() - new Date(String(a.effectiveFrom)).getTime();
  });
  const rule = candidates[0];
  if (!rule) throw new Error("No active commission rule applies to this order item");
  return rule;
}

export async function createOrderItemCommissionAllocation(databases: Databases, databaseId: string, transactionId: string, input: ResolveInput & { orderId: string; vendorOrderId: string; orderItemId: string; grossMinor: number; discountMinor?: number; currency: string; calculatedAt: string }) {
  const rule = await resolveCommissionRule(databases, databaseId, transactionId, { ...input, at: input.calculatedAt });
  const amounts = calculateCommission(input.grossMinor, input.discountMinor ?? 0, Number(rule.rateBasisPoints));
  return databases.createDocument({ databaseId, collectionId: "commission_allocations", documentId: ID.unique(), permissions: [], transactionId, data: {
    orderId: input.orderId, vendorOrderId: input.vendorOrderId, orderItemId: input.orderItemId, vendorId: input.vendorId,
    ruleId: rule.$id, ruleVersion: Number(rule.version ?? 1), scopeType: String(rule.scopeType ?? "global"), channel: input.channel,
    grossMinor: amounts.grossMinor, discountMinor: amounts.discountMinor, commissionBaseMinor: amounts.commissionBaseMinor,
    rateBasisPoints: Number(rule.rateBasisPoints), pacsmMinor: amounts.pacsmMinor, vendorMinor: amounts.vendorMinor,
    processingFeeMinor: 0, feeBearer: String(rule.feeBearer ?? "platform"), currency: input.currency, status: "accrued", calculatedAt: input.calculatedAt
  } });
}

export async function listCommissionRules() {
  return createAppwriteDatabaseClient().databases.listDocuments({ databaseId: env().APPWRITE_DATABASE_ID, collectionId: "commission_rules", queries: [Query.orderDesc("effectiveFrom"), Query.limit(500)] });
}

export async function listVendorCommissionAllocations(vendorId: string) {
  return createAppwriteDatabaseClient().databases.listDocuments({ databaseId: env().APPWRITE_DATABASE_ID, collectionId: "commission_allocations", queries: [Query.equal("vendorId", vendorId), Query.orderDesc("calculatedAt"), Query.limit(500)] });
}

export async function createCommissionRule(input: { name: string; scopeType: CommissionScope; scopeId: string; channel: CommissionChannel | "all"; rateBasisPoints: number; priority: number; feeBearer: "platform" | "vendor" | "proportional"; effectiveFrom: string; reason: string; actorUserId: string; activate: boolean }) {
  if (input.name.trim().length < 3 || input.reason.trim().length < 10) throw new Error("Name and a meaningful reason are required");
  if (!Number.isSafeInteger(input.rateBasisPoints) || input.rateBasisPoints < 0 || input.rateBasisPoints > 10_000) throw new Error("Invalid percentage");
  if (!Number.isSafeInteger(input.priority) || input.priority < 0 || input.priority > 1000) throw new Error("Invalid priority");
  if (!["global", "channel", "category", "vendor", "product", "platform_owned"].includes(input.scopeType)) throw new Error("Invalid scope");
  if (!["global", "channel"].includes(input.scopeType) && !input.scopeId.trim()) throw new Error("A scope identifier is required");
  const effectiveFrom = new Date(input.effectiveFrom);
  if (Number.isNaN(effectiveFrom.getTime()) || effectiveFrom.getTime() < Date.now() - 60_000) throw new Error("Rules cannot take effect retrospectively");
  const databases = createAppwriteDatabaseClient().databases, databaseId = env().APPWRITE_DATABASE_ID;
  const transaction = await databases.createTransaction({ ttl: 120 });
  try {
    const existing = await databases.listDocuments({ databaseId, collectionId:"commission_rules", queries:[Query.equal("status",["active","scheduled"]),Query.limit(500)], transactionId:transaction.$id });
    const sameScope = existing.documents.filter(rule => String(rule.scopeType ?? "global") === input.scopeType && String(rule.scopeId ?? "") === input.scopeId.trim() && String(rule.channel ?? "all") === input.channel && rule.$id !== "pacsm-owned-products");
    if (input.activate) for (const rule of sameScope) {
      const starts = new Date(String(rule.effectiveFrom)).getTime();
      if (starts >= effectiveFrom.getTime()) await databases.updateDocument({ databaseId, collectionId:"commission_rules", documentId:rule.$id, transactionId:transaction.$id, data:{status:"retired",effectiveTo:effectiveFrom.toISOString()} });
      else await databases.updateDocument({ databaseId, collectionId:"commission_rules", documentId:rule.$id, transactionId:transaction.$id, data:{effectiveTo:effectiveFrom.toISOString()} });
    }
    const version = Math.max(0, ...existing.documents.filter(rule => String(rule.scopeType ?? "global") === input.scopeType && String(rule.scopeId ?? "") === input.scopeId.trim() && String(rule.channel ?? "all") === input.channel).map(rule => Number(rule.version ?? 1))) + 1;
    const rule = await databases.createDocument({ databaseId, collectionId:"commission_rules", documentId:ID.unique(), permissions:[], transactionId:transaction.$id, data:{name:input.name.trim(),rateBasisPoints:input.rateBasisPoints,status:input.activate?(effectiveFrom.getTime()>Date.now()?"scheduled":"active"):"draft",effectiveFrom:effectiveFrom.toISOString(),createdAt:new Date().toISOString(),scopeType:input.scopeType,...(input.scopeId.trim()?{scopeId:input.scopeId.trim()}:{}),channel:input.channel,priority:input.priority,version,feeBase:"merchandise_subtotal",feeBearer:input.feeBearer,createdBy:input.actorUserId,...(input.activate?{approvedBy:input.actorUserId}:{}),reason:input.reason.trim() } });
    await databases.createDocument({ databaseId, collectionId:"audit_logs", documentId:ID.unique(), permissions:[], transactionId:transaction.$id, data:{actorUserId:input.actorUserId,action:input.activate?"commission_rule.activate":"commission_rule.create_draft",entityType:"commission_rule",entityId:rule.$id,metadata:JSON.stringify({scopeType:input.scopeType,scopeId:input.scopeId,channel:input.channel,rateBasisPoints:input.rateBasisPoints,version}),occurredAt:new Date().toISOString()} });
    await databases.updateTransaction({ transactionId:transaction.$id, commit:true });
    return rule.$id;
  } catch (error) { await databases.updateTransaction({transactionId:transaction.$id,rollback:true}).catch(()=>undefined); throw error; }
}

export async function retireCommissionRule(ruleId: string, actorUserId: string, reason: string) {
  if (ruleId === "default-marketplace" || ruleId === "pacsm-owned-products") throw new Error("Protected baseline rules cannot be retired");
  if (reason.trim().length < 10) throw new Error("A meaningful retirement reason is required");
  const databases=createAppwriteDatabaseClient().databases,databaseId=env().APPWRITE_DATABASE_ID,now=new Date().toISOString();
  const transaction=await databases.createTransaction({ttl:120});
  try { const rule=await databases.getDocument({databaseId,collectionId:"commission_rules",documentId:ruleId,transactionId:transaction.$id}); if(String(rule.status)==="retired")throw new Error("Rule is already retired"); if(String(rule.scopeType??"global")==="global"&&String(rule.channel??"all")==="all")throw new Error("The marketplace default must be replaced, not retired"); await databases.updateDocument({databaseId,collectionId:"commission_rules",documentId:ruleId,transactionId:transaction.$id,data:{status:"retired",effectiveTo:now}}); await databases.createDocument({databaseId,collectionId:"audit_logs",documentId:ID.unique(),permissions:[],transactionId:transaction.$id,data:{actorUserId,action:"commission_rule.retire",entityType:"commission_rule",entityId:ruleId,metadata:JSON.stringify({reason:reason.trim()}),occurredAt:now}}); await databases.updateTransaction({transactionId:transaction.$id,commit:true}); }
  catch(error){await databases.updateTransaction({transactionId:transaction.$id,rollback:true}).catch(()=>undefined);throw error;}
}
