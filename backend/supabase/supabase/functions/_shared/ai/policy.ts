import type { ApprovalStatus, RiskLevel } from "./entity.ts";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

/** Highest risk an agent may execute without a human approving the exact call. */
export type AutoApproveLevel = RiskLevel | "none";

export type ToolDecision =
  | { kind: "execute" }
  | { kind: "request_approval" }
  | { kind: "wait_for_approval" }
  | { kind: "reject" };

export function isAutoApproved(risk: RiskLevel, autoApproveUpTo: AutoApproveLevel): boolean {
  if (autoApproveUpTo === "none") return false;
  return RISK_RANK[risk] <= RISK_RANK[autoApproveUpTo];
}

/**
 * Permission and scope checks happen before this; this only decides whether a
 * permitted call may run now or needs a human first.
 */
export function decideToolExecution(params: {
  risk: RiskLevel;
  autoApproveUpTo: AutoApproveLevel;
  approvalStatus: ApprovalStatus | null;
}): ToolDecision {
  switch (params.approvalStatus) {
    case "approved":
      return { kind: "execute" };
    case "rejected":
      return { kind: "reject" };
    case "pending":
      return { kind: "wait_for_approval" };
  }

  return isAutoApproved(params.risk, params.autoApproveUpTo)
    ? { kind: "execute" }
    : { kind: "request_approval" };
}

const BASE_RETRY_SECONDS = 15;
const MAX_RETRY_SECONDS = 15 * 60;

/** Exponential backoff for retryable failures (provider 429/5xx, crashed workers). */
export function retryDelaySeconds(attempt: number): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(MAX_RETRY_SECONDS, BASE_RETRY_SECONDS * 2 ** exponent);
}
