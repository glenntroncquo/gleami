export type RiskLevel = "low" | "medium" | "high";

export type RunStatus =
  | "queued"
  | "running"
  | "awaiting_approval"
  | "succeeded"
  | "failed"
  | "cancelled";

export type StepStatus = "running" | "succeeded" | "failed" | "awaiting_approval" | "rejected";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ActorType = "user" | "system";

export interface AgentRunInput {
  message: string;
}

export interface AgentRun {
  id: string;
  companyId: string;
  locationId: string | null;
  agentKey: string;
  actorType: ActorType;
  actorUserId: string | null;
  status: RunStatus;
  input: AgentRunInput;
  output: unknown;
  error: string | null;
  attemptCount: number;
  maxAttempts: number;
  leaseVersion: number;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  nextAttemptAt: string;
  createdAt: string;
}

export interface ToolCall {
  id: string;
  name: string;
  /** Raw JSON text produced by the model; validated before anything runs. */
  arguments: string;
}

export interface ModelStepOutput {
  content: string | null;
  toolCalls: ToolCall[];
}

export interface AgentStep {
  id: string;
  runId: string;
  sequence: number;
  kind: "model" | "tool";
  status: StepStatus;
  toolCallId: string | null;
  toolName: string | null;
  input: unknown;
  output: unknown;
  error: string | null;
  approvalId: string | null;
}

export interface Approval {
  id: string;
  runId: string;
  companyId: string;
  locationId: string | null;
  toolCallId: string;
  toolName: string;
  toolInput: unknown;
  risk: RiskLevel;
  status: ApprovalStatus;
}
