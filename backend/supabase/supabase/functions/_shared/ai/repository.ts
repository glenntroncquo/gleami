import type { Database, Json } from "@/types/database";
import { supabaseAdmin } from "../infrastructure/supabase/client.ts";
import { RepositoryError } from "../infrastructure/errors.ts";
import type {
  ActorType,
  AgentRun,
  AgentRunInput,
  AgentStep,
  Approval,
  ApprovalStatus,
  RiskLevel,
  RunStatus,
  StepStatus,
} from "./entity.ts";

type RunRow = Database["public"]["Tables"]["ai_agent_run"]["Row"];
type StepRow = Database["public"]["Tables"]["ai_agent_step"]["Row"];
type ApprovalRow = Database["public"]["Tables"]["ai_approval"]["Row"];

const UNIQUE_VIOLATION = "23505";

function toRun(row: RunRow): AgentRun {
  return {
    id: row.id,
    companyId: row.company_id,
    locationId: row.location_id,
    agentKey: row.agent_key,
    actorType: row.actor_type as ActorType,
    actorUserId: row.actor_user_id,
    status: row.status as RunStatus,
    input: row.input as unknown as AgentRunInput,
    output: row.output,
    error: row.error,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    leaseVersion: row.lease_version,
    leaseOwner: row.lease_owner,
    leaseExpiresAt: row.lease_expires_at,
    nextAttemptAt: row.next_attempt_at,
    createdAt: row.created_at,
  };
}

function toStep(row: StepRow): AgentStep {
  return {
    id: row.id,
    runId: row.run_id,
    sequence: row.sequence,
    kind: row.kind as AgentStep["kind"],
    status: row.status as StepStatus,
    toolCallId: row.tool_call_id,
    toolName: row.tool_name,
    input: row.input,
    output: row.output,
    error: row.error,
    approvalId: row.approval_id,
  };
}

function toApproval(row: ApprovalRow): Approval {
  return {
    id: row.id,
    runId: row.run_id,
    companyId: row.company_id,
    locationId: row.location_id,
    toolCallId: row.tool_call_id,
    toolName: row.tool_name,
    toolInput: row.tool_input,
    risk: row.risk as RiskLevel,
    status: row.status as ApprovalStatus,
  };
}

function asJson(value: unknown): Json {
  return (value ?? null) as Json;
}

function inSeconds(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export interface CreateRunParams {
  companyId: string;
  locationId: string | null;
  agentKey: string;
  actorType: ActorType;
  actorUserId: string | null;
  input: AgentRunInput;
  idempotencyKey: string | null;
}

export interface CreateStepParams {
  runId: string;
  companyId: string;
  sequence: number;
  kind: AgentStep["kind"];
  status: StepStatus;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  error?: string | null;
  approvalId?: string | null;
  model?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
}

export const aiRunRepository = {
  /** Returns the existing run when the same actor retries with the same idempotency key. */
  async createRun(params: CreateRunParams): Promise<{ run: AgentRun; created: boolean }> {
    const { data, error } = await supabaseAdmin
      .from("ai_agent_run")
      .insert({
        company_id: params.companyId,
        location_id: params.locationId,
        agent_key: params.agentKey,
        actor_type: params.actorType,
        actor_user_id: params.actorUserId,
        input: asJson(params.input),
        idempotency_key: params.idempotencyKey,
      })
      .select()
      .single();

    if (!error && data) {
      return { run: toRun(data), created: true };
    }

    if (error?.code === UNIQUE_VIOLATION && params.idempotencyKey) {
      let existing = supabaseAdmin
        .from("ai_agent_run")
        .select("*")
        .eq("company_id", params.companyId)
        .eq("idempotency_key", params.idempotencyKey);
      existing = params.actorUserId
        ? existing.eq("actor_user_id", params.actorUserId)
        : existing.is("actor_user_id", null);
      const { data: row, error: lookupError } = await existing.maybeSingle();
      if (lookupError || !row) {
        throw new RepositoryError("Failed to load run for idempotency key", { cause: lookupError });
      }
      return { run: toRun(row), created: false };
    }

    throw new RepositoryError("Failed to create agent run", { cause: error });
  },

  async findRunById(id: string): Promise<AgentRun | null> {
    const { data, error } = await supabaseAdmin
      .from("ai_agent_run")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      throw new RepositoryError("Failed to load agent run", { cause: error });
    }
    return data ? toRun(data) : null;
  },

  /** Queued runs whose backoff has elapsed, plus running runs whose worker vanished. */
  async findDueRuns(limit: number): Promise<AgentRun[]> {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("ai_agent_run")
      .select("*")
      .in("status", ["queued", "running"])
      .lte("next_attempt_at", now)
      .or(`status.eq.queued,lease_expires_at.lt.${now}`)
      .order("next_attempt_at", { ascending: true })
      .limit(limit);
    if (error) {
      throw new RepositoryError("Failed to load due agent runs", { cause: error });
    }
    return (data ?? []).map(toRun);
  },

  /**
   * Compare-and-set on lease_version: of several workers that saw the same
   * row, exactly one update matches. Taking over an expired lease counts as
   * a failed attempt, so a run that keeps crashing its worker eventually stops.
   */
  async claimRun(run: AgentRun, leaseOwner: string, leaseSeconds: number): Promise<AgentRun | null> {
    const now = new Date();
    const isQueued = run.status === "queued";
    const leaseExpired = run.status === "running" &&
      (!run.leaseExpiresAt || new Date(run.leaseExpiresAt) < now);
    if (!isQueued && !leaseExpired) return null;
    if (new Date(run.nextAttemptAt) > now) return null;

    const { data, error } = await supabaseAdmin
      .from("ai_agent_run")
      .update({
        status: "running",
        lease_owner: leaseOwner,
        lease_expires_at: inSeconds(leaseSeconds),
        lease_version: run.leaseVersion + 1,
        attempt_count: leaseExpired ? run.attemptCount + 1 : run.attemptCount,
        updated_at: now.toISOString(),
      })
      .eq("id", run.id)
      .eq("lease_version", run.leaseVersion)
      .eq("status", run.status)
      .select()
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to claim agent run", { cause: error });
    }
    return data ? toRun(data) : null;
  },

  /** False when another worker took the run over; the caller must stop immediately. */
  async extendLease(runId: string, leaseOwner: string, leaseSeconds: number): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from("ai_agent_run")
      .update({ lease_expires_at: inSeconds(leaseSeconds), updated_at: new Date().toISOString() })
      .eq("id", runId)
      .eq("lease_owner", leaseOwner)
      .eq("status", "running")
      .select("id")
      .maybeSingle();
    if (error) {
      throw new RepositoryError("Failed to extend agent run lease", { cause: error });
    }
    return data != null;
  },

  async releaseRun(
    runId: string,
    leaseOwner: string,
    update: {
      status: Exclude<RunStatus, "running">;
      output?: unknown;
      error?: string | null;
      attemptCount?: number;
      nextAttemptAt?: string;
    },
  ): Promise<boolean> {
    const terminal = update.status === "succeeded" || update.status === "failed" ||
      update.status === "cancelled";
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("ai_agent_run")
      .update({
        status: update.status,
        lease_owner: null,
        lease_expires_at: null,
        updated_at: now,
        ...(update.output !== undefined && { output: asJson(update.output) }),
        ...(update.error !== undefined && { error: update.error }),
        ...(update.attemptCount !== undefined && { attempt_count: update.attemptCount }),
        ...(update.nextAttemptAt !== undefined && { next_attempt_at: update.nextAttemptAt }),
        ...(terminal && { completed_at: now }),
      })
      .eq("id", runId)
      .eq("lease_owner", leaseOwner)
      .eq("status", "running")
      .select("id")
      .maybeSingle();
    if (error) {
      throw new RepositoryError("Failed to release agent run", { cause: error });
    }
    return data != null;
  },

  /** awaiting_approval → queued once every pending decision on the run is made. */
  async resumeAfterApproval(runId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from("ai_agent_run")
      .update({
        status: "queued",
        next_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId)
      .eq("status", "awaiting_approval")
      .select("id")
      .maybeSingle();
    if (error) {
      throw new RepositoryError("Failed to resume agent run", { cause: error });
    }
    return data != null;
  },

  async listSteps(runId: string): Promise<AgentStep[]> {
    const { data, error } = await supabaseAdmin
      .from("ai_agent_step")
      .select("*")
      .eq("run_id", runId)
      .order("sequence", { ascending: true });
    if (error) {
      throw new RepositoryError("Failed to load agent steps", { cause: error });
    }
    return (data ?? []).map(toStep);
  },

  async insertStep(params: CreateStepParams): Promise<AgentStep> {
    const completed = params.status !== "running" && params.status !== "awaiting_approval";
    const { data, error } = await supabaseAdmin
      .from("ai_agent_step")
      .insert({
        run_id: params.runId,
        company_id: params.companyId,
        sequence: params.sequence,
        kind: params.kind,
        status: params.status,
        tool_call_id: params.toolCallId ?? null,
        tool_name: params.toolName ?? null,
        input: asJson(params.input),
        output: asJson(params.output),
        error: params.error ?? null,
        approval_id: params.approvalId ?? null,
        model: params.model ?? null,
        input_tokens: params.inputTokens ?? null,
        output_tokens: params.outputTokens ?? null,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .select()
      .single();
    if (error || !data) {
      throw new RepositoryError("Failed to record agent step", { cause: error });
    }
    return toStep(data);
  },

  async finishStep(
    stepId: string,
    update: { status: StepStatus; output?: unknown; error?: string | null; approvalId?: string | null },
  ): Promise<void> {
    const completed = update.status !== "running" && update.status !== "awaiting_approval";
    const { error } = await supabaseAdmin
      .from("ai_agent_step")
      .update({
        status: update.status,
        ...(update.output !== undefined && { output: asJson(update.output) }),
        ...(update.error !== undefined && { error: update.error }),
        ...(update.approvalId !== undefined && { approval_id: update.approvalId }),
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", stepId);
    if (error) {
      throw new RepositoryError("Failed to update agent step", { cause: error });
    }
  },

  async findApprovalById(id: string): Promise<Approval | null> {
    const { data, error } = await supabaseAdmin
      .from("ai_approval")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      throw new RepositoryError("Failed to load approval", { cause: error });
    }
    return data ? toApproval(data) : null;
  },

  /** Idempotent per tool call: a retried worker gets the same approval row back. */
  async requestApproval(params: {
    runId: string;
    companyId: string;
    locationId: string | null;
    toolCallId: string;
    toolName: string;
    toolInput: unknown;
    risk: RiskLevel;
  }): Promise<Approval> {
    const { error } = await supabaseAdmin
      .from("ai_approval")
      .upsert(
        {
          run_id: params.runId,
          company_id: params.companyId,
          location_id: params.locationId,
          tool_call_id: params.toolCallId,
          tool_name: params.toolName,
          tool_input: asJson(params.toolInput),
          risk: params.risk,
        },
        { onConflict: "run_id,tool_call_id", ignoreDuplicates: true },
      );
    if (error) {
      throw new RepositoryError("Failed to request approval", { cause: error });
    }

    const { data, error: loadError } = await supabaseAdmin
      .from("ai_approval")
      .select("*")
      .eq("run_id", params.runId)
      .eq("tool_call_id", params.toolCallId)
      .single();
    if (loadError || !data) {
      throw new RepositoryError("Failed to load approval", { cause: loadError });
    }
    return toApproval(data);
  },

  async decideApproval(
    id: string,
    decision: Exclude<ApprovalStatus, "pending">,
    decidedBy: string,
  ): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from("ai_approval")
      .update({ status: decision, decided_by: decidedBy, decided_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (error) {
      throw new RepositoryError("Failed to record approval decision", { cause: error });
    }
    return data != null;
  },

  async countPendingApprovals(runId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from("ai_approval")
      .select("id", { count: "exact", head: true })
      .eq("run_id", runId)
      .eq("status", "pending");
    if (error) {
      throw new RepositoryError("Failed to count pending approvals", { cause: error });
    }
    return count ?? 0;
  },
};
