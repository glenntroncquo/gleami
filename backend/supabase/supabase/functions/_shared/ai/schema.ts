import { z } from "zod";

export const aiCommandSchema = z
  .object({
    company_id: z.string().uuid("Invalid company_id format"),
    location_id: z.string().uuid("Invalid location_id format").nullish(),
    agent: z.string().min(1).max(64).default("assistant"),
    message: z.string().trim().min(1, "message is required").max(4000),
    idempotency_key: z.string().min(8).max(200).nullish(),
  })
  .transform((data) => ({
    companyId: data.company_id,
    locationId: data.location_id ?? null,
    agentKey: data.agent,
    message: data.message,
    idempotencyKey: data.idempotency_key ?? null,
  }));

export type AiCommandInput = z.infer<typeof aiCommandSchema>;

export const aiApprovalDecisionSchema = z
  .object({
    approval_id: z.string().uuid("Invalid approval_id format"),
    decision: z.enum(["approve", "reject"]),
  })
  .transform((data) => ({
    approvalId: data.approval_id,
    decision: data.decision === "approve" ? "approved" as const : "rejected" as const,
  }));

export const aiWorkerSchema = z
  .object({
    run_id: z.string().uuid("Invalid run_id format").optional(),
  })
  .transform((data) => ({ runId: data.run_id }));
