import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { normalizePhoneToE164 } from "@/src/modules/localization/domain/phone";

const db = () => createAppwriteDatabaseClient().databases;
const databaseId = () => env().APPWRITE_DATABASE_ID;
const now = () => new Date().toISOString();

export const findOfftaker = (userId: string) => db().listDocuments({ databaseId: databaseId(), collectionId: "offtaker_applications", queries: [Query.equal("ownerUserId", userId), Query.limit(1)] }).then((r) => r.documents[0] ?? null);
export const listOfftakers = () => db().listDocuments({ databaseId: databaseId(), collectionId: "offtaker_applications", queries: [Query.orderDesc("submittedAt"), Query.limit(200)] });
export const listRequirements = (queries: string[] = []) => db().listDocuments({ databaseId: databaseId(), collectionId: "offtaker_requirements", queries: [...queries, Query.orderDesc("createdAt"), Query.limit(200)] });
export const listProposals = (requirementId: string) => db().listDocuments({ databaseId: databaseId(), collectionId: "offtake_proposals", queries: [Query.equal("requirementId", requirementId), Query.limit(200)] });
export const listAgreements = (offtakerId: string) => db().listDocuments({ databaseId: databaseId(), collectionId: "offtake_agreements", queries: [Query.equal("offtakerId", offtakerId), Query.limit(200)] });

export async function applyOfftaker(data: Record<string, string>, userId: string) {
  return db().createDocument({ databaseId: databaseId(), collectionId: "offtaker_applications", documentId: ID.unique(), permissions: [], data: { ownerUserId: userId, legalName: data.legalName, registrationNumber: data.registrationNumber, ...(data.taxId ? { taxId: data.taxId } : {}), countryCode: data.countryCode.toUpperCase(), address: data.address, industry: data.industry, buyerType: data.buyerType, contactName: data.contactName, contactEmail: data.contactEmail.toLowerCase(), contactPhone: normalizePhoneToE164(data.contactPhone, data.phoneCountryCode), productCategories: data.productCategories, expectedVolume: data.expectedVolume, buyingFrequency: data.buyingFrequency, sourcingCountries: data.sourcingCountries, currency: data.currency.toUpperCase(), deliveryLocations: data.deliveryLocations, paymentTerms: data.paymentTerms, status: "submitted", verificationLevel: "registered", submittedAt: now() } });
}

export async function reviewOfftaker(offtakerId: string, action: string, level: string, notes: string, actor: string) {
  if (!['approve', 'reject', 'request_information'].includes(action) || !['registered', 'verified', 'credit_approved'].includes(level)) throw new Error("Invalid review");
  await db().updateDocument({ databaseId: databaseId(), collectionId: "offtaker_applications", documentId: offtakerId, data: { status: action === "approve" ? "approved" : action, verificationLevel: action === "approve" ? level : "registered", reviewedAt: now(), reviewedBy: actor, reviewNotes: notes } });
}

export async function createRequirement(userId: string, data: Record<string, string>) {
  const buyer = await findOfftaker(userId);
  if (!buyer || buyer.status !== "approved") throw new Error("Verified off-taker required");
  return db().createDocument({ databaseId: databaseId(), collectionId: "offtaker_requirements", documentId: ID.unique(), permissions: [], data: { offtakerId: buyer.$id, ownerUserId: userId, title: data.title, productName: data.productName, specifications: data.specifications, quantity: Number(data.quantity), unit: data.unit, frequency: data.frequency, ...(data.targetPrice ? { targetPriceMinor: Math.round(Number(data.targetPrice) * 100) } : {}), currency: data.currency.toUpperCase(), deliveryDestination: data.deliveryDestination, packagingRequirements: data.packagingRequirements, certificationRequirements: data.certificationRequirements, originRestrictions: data.originRestrictions, applicationDeadline: new Date(data.applicationDeadline).toISOString(), paymentTerms: data.paymentTerms, contractDurationMonths: Number(data.contractDurationMonths), status: "published", createdAt: now() } });
}

export async function submitProposal(vendorId: string, requirementId: string, data: Record<string, string>) {
  const requirement = await db().getDocument({ databaseId: databaseId(), collectionId: "offtaker_requirements", documentId: requirementId });
  if (requirement.status !== "published" || new Date(String(requirement.applicationDeadline)) < new Date()) throw new Error("Requirement closed");
  return db().createDocument({ databaseId: databaseId(), collectionId: "offtake_proposals", documentId: ID.unique(), permissions: [], data: { requirementId, vendorId, quantity: Number(data.quantity), unitPriceMinor: Math.round(Number(data.unitPrice) * 100), currency: String(requirement.currency), leadTimeDays: Number(data.leadTimeDays), certifications: data.certifications, terms: data.terms, status: "submitted", submittedAt: now() } });
}

export async function updateProposalStatus(userId: string, proposalId: string, status: string) {
  if (!['shortlisted', 'revision_requested', 'rejected'].includes(status)) throw new Error("Invalid proposal action");
  const proposal = await db().getDocument({ databaseId: databaseId(), collectionId: "offtake_proposals", documentId: proposalId });
  const requirement = await db().getDocument({ databaseId: databaseId(), collectionId: "offtaker_requirements", documentId: String(proposal.requirementId) });
  if (requirement.ownerUserId !== userId) throw new Error("Not permitted");
  await db().updateDocument({ databaseId: databaseId(), collectionId: "offtake_proposals", documentId: proposalId, data: { status } });
}

export async function awardProposal(userId: string, proposalId: string, quantity: number, paymentModel: string) {
  const proposal = await db().getDocument({ databaseId: databaseId(), collectionId: "offtake_proposals", documentId: proposalId });
  const requirement = await db().getDocument({ databaseId: databaseId(), collectionId: "offtaker_requirements", documentId: String(proposal.requirementId) });
  if (requirement.ownerUserId !== userId || quantity < 1 || quantity > Number(proposal.quantity)) throw new Error("Invalid award");
  const createdAt = now(), amountMinor = quantity * Number(proposal.unitPriceMinor), awardId = ID.unique();
  const existing = await db().listDocuments({ databaseId: databaseId(), collectionId: "offtake_agreements", queries: [Query.equal("requirementId", requirement.$id), Query.limit(1)] });
  let agreementId: string;
  if (existing.documents[0]) {
    const agreement = existing.documents[0]; agreementId = agreement.$id;
    await db().updateDocument({ databaseId: databaseId(), collectionId: "offtake_agreements", documentId: agreementId, data: { totalQuantity: Number(agreement.totalQuantity) + quantity, totalMinor: Number(agreement.totalMinor) + amountMinor } });
  } else {
    agreementId = ID.unique();
    await db().createDocument({ databaseId: databaseId(), collectionId: "offtake_agreements", documentId: agreementId, permissions: [], data: { offtakerId: requirement.offtakerId, requirementId: requirement.$id, agreementNumber: `PAC-OFF-${agreementId.slice(-10).toUpperCase()}`, paymentModel, totalQuantity: quantity, totalMinor: amountMinor, currency: proposal.currency, terms: proposal.terms, status: "active", startsAt: createdAt, endsAt: new Date(Date.now() + Number(requirement.contractDurationMonths) * 2592000000).toISOString(), createdAt } });
  }
  await db().createDocument({ databaseId: databaseId(), collectionId: "offtake_awards", documentId: awardId, permissions: [], data: { requirementId: requirement.$id, proposalId, vendorId: proposal.vendorId, quantity, amountMinor, currency: proposal.currency, status: "awarded", awardedAt: createdAt } });
  await db().updateDocument({ databaseId: databaseId(), collectionId: "offtake_proposals", documentId: proposalId, data: { status: "awarded" } });
  const scheduleId = ID.unique();
  const schedule = await db().createDocument({ databaseId: databaseId(), collectionId: "offtake_schedules", documentId: scheduleId, permissions: [], data: { scheduleNumber: `PAC-PO-${scheduleId.slice(-10).toUpperCase()}`, agreementId, awardId, vendorId: proposal.vendorId, quantity, dueAt: new Date(Date.now() + Number(proposal.leadTimeDays) * 86400000).toISOString(), destination: requirement.deliveryDestination, status: "scheduled" } });
  await db().createDocument({ databaseId: databaseId(), collectionId: "offtake_payment_milestones", documentId: ID.unique(), permissions: [], data: { agreementId, scheduleId: schedule.$id, milestoneType: paymentModel, amountMinor, currency: proposal.currency, status: "due", dueAt: String(schedule.dueAt) } });
  return agreementId;
}

export async function inspectSchedule(scheduleId: string, result: string, acceptedQuantity: number, notes: string, actor: string) {
  if (!['accepted', 'partially_accepted', 'rejected'].includes(result)) throw new Error("Invalid inspection");
  await db().createDocument({ databaseId: databaseId(), collectionId: "offtake_inspections", documentId: ID.unique(), permissions: [], data: { scheduleId, result, acceptedQuantity, notes, inspectedBy: actor, inspectedAt: now() } });
  await db().updateDocument({ databaseId: databaseId(), collectionId: "offtake_schedules", documentId: scheduleId, data: { status: result === "accepted" ? "accepted" : "inspection_exception", deliveredAt: now() } });
}

export async function recordMilestonePayment(milestoneId: string, status: string) {
  if (!['processing', 'paid', 'settled', 'failed'].includes(status)) throw new Error("Invalid payment status");
  await db().updateDocument({ databaseId: databaseId(), collectionId: "offtake_payment_milestones", documentId: milestoneId, data: { status, ...(status === 'paid' || status === 'settled' ? { paidAt: now() } : {}) } });
}

export async function createDispute(userId: string, agreementId: string, scheduleId: string, category: string, description: string) {
  const buyer = await findOfftaker(userId); const agreement = await db().getDocument({ databaseId: databaseId(), collectionId: "offtake_agreements", documentId: agreementId });
  if (!buyer || agreement.offtakerId !== buyer.$id) throw new Error("Not permitted");
  return db().createDocument({ databaseId: databaseId(), collectionId: "offtake_disputes", documentId: ID.unique(), permissions: [], data: { agreementId, ...(scheduleId ? { scheduleId } : {}), raisedByUserId: userId, category, description, status: "open", createdAt: now(), updatedAt: now() } });
}

export async function resolveDispute(disputeId: string, status: string, resolution: string) {
  if (!['under_review', 'resolved', 'closed'].includes(status)) throw new Error("Invalid dispute status");
  await db().updateDocument({ databaseId: databaseId(), collectionId: "offtake_disputes", documentId: disputeId, data: { status, resolution, updatedAt: now() } });
}
