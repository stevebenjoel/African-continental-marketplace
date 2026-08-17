export type ComplianceRequirement = { id: string; mandatory: boolean };
export function complianceProgress(requirements: ComplianceRequirement[], completedIds: readonly string[]) { const mandatory = requirements.filter(item => item.mandatory), completed = mandatory.filter(item => completedIds.includes(item.id)).length; return { completed, total: mandatory.length, percent: mandatory.length ? Math.round(completed / mandatory.length * 100) : 100, ready: completed === mandatory.length }; }
export const CERTIFICATION_REVIEW_ACTIONS = ["approve", "reject", "request_information", "send_to_quality_centre"] as const;
export type CertificationReviewAction = typeof CERTIFICATION_REVIEW_ACTIONS[number];
export const isCertificationReviewAction = (value: string): value is CertificationReviewAction => (CERTIFICATION_REVIEW_ACTIONS as readonly string[]).includes(value);
